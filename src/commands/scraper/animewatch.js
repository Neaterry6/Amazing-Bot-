import axios from 'axios';

const ANOBOY_API = 'https://omegatech-api.dixonomega.tech/api/Anime/Anoboy';
const AIO_API = 'https://omegatech-api-lscz.onrender.com/api/download/All-downloader-v2';

function cleanTitle(text = '') {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function truncate(text = '', max = 900) {
    const value = String(text || '').trim();
    return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function anoboy(action, params = {}) {
    const { data } = await axios.get(ANOBOY_API, {
        params: { action, ...params },
        timeout: 60000,
        headers: { 'User-Agent': 'Asta-Bot/1.0' }
    });
    if (!data?.success) throw new Error(data?.error || data?.message || `Anoboy ${action} failed`);
    return data.result || {};
}

function episodeNumber(ep = {}, fallback = 0) {
    const n = Number(ep.episode || ep.number || fallback);
    return Number.isFinite(n) ? n : fallback;
}

function sortedEpisodes(episodes = []) {
    return [...episodes].sort((a, b) => episodeNumber(a) - episodeNumber(b));
}

function pickMedia(result = {}) {
    const medias = Array.isArray(result.medias) ? result.medias : [];
    return medias.find((m) => /^https?:\/\//i.test(m?.url || '') && m?.type === 'video')
        || medias.find((m) => /^https?:\/\//i.test(m?.url || ''))
        || null;
}

async function tryAioDownload(url) {
    try {
        const { data } = await axios.get(AIO_API, {
            params: { url },
            timeout: 90000,
            headers: { 'User-Agent': 'Asta-Bot/1.0' }
        });
        if (!data?.success) return null;
        return { raw: data, media: pickMedia(data.result || {}) };
    } catch {
        return null;
    }
}

async function sendEpisode(sock, from, message, animeTitle, ep) {
    const epTitle = cleanTitle(ep.title || `Episode ${ep.episode || ''}`);
    const epUrl = ep.url;
    if (!epUrl) return sock.sendMessage(from, { text: '❌ Episode URL not found.' }, { quoted: message });

    await sock.sendMessage(from, { text: `📥 Preparing ${epTitle}...` }, { quoted: message });
    const aio = await tryAioDownload(epUrl);
    const media = aio?.media;

    if (media?.url) {
        const result = aio.raw?.result || {};
        const caption = [
            `🎬 *${cleanTitle(animeTitle)}*`,
            `📺 ${epTitle}`,
            result.duration ? `⏱️ ${result.duration}` : '',
            `🔗 ${epUrl}`
        ].filter(Boolean).join('\n');

        if (media.type === 'audio') {
            return sock.sendMessage(from, {
                audio: { url: media.url },
                mimetype: 'audio/mpeg',
                fileName: `${epTitle.replace(/[\\/:*?"<>|]/g, '').slice(0, 120)}.${media.extension || 'mp3'}`,
                caption
            }, { quoted: message });
        }

        return sock.sendMessage(from, {
            video: { url: media.url },
            mimetype: media.extension === 'mkv' ? 'video/x-matroska' : 'video/mp4',
            caption
        }, { quoted: message });
    }

    return sock.sendMessage(from, {
        text: `🎬 *${cleanTitle(animeTitle)}*\n📺 ${epTitle}\n\n🔗 Watch/Download: ${epUrl}\n\nI could not extract a direct media file, so open the link in your browser.`
    }, { quoted: message });
}

export default {
    name: 'animewatch',
    aliases: ['anime', 'anoboy', 'anidownload', 'animedl'],
    category: 'scraper',
    description: 'Search Anoboy anime, show details, and open/download episodes',
    usage: 'anime <search term>',
    cooldown: 5,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, args, from, prefix }) {
        const query = args.join(' ').trim();
        if (!query) {
            return sock.sendMessage(from, {
                text: `🎬 *Anime Search & Download*\n\nUsage: ${prefix}anime <name>\n\nReply with a result number, then reply with an episode number.`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });
            const search = await anoboy('search', { query });
            const results = Array.isArray(search.results) ? search.results : [];
            if (!results.length) {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(from, { text: `❌ No anime found for "${query}".` }, { quoted: message });
            }

            const list = results.slice(0, 10);
            const lines = list.map((anime, i) => [
                `${i + 1}. *${cleanTitle(anime.title)}*`,
                `   📺 ${anime.type || 'N/A'} | ${anime.status || 'N/A'} | ${anime.subtitle || 'Sub'}`,
                `   🎞️ ${anime.episode || 'N/A'}`
            ].join('\n'));

            const sent = await sock.sendMessage(from, {
                text: `🎬 *Anime Results for:* ${query}\n\n${lines.join('\n\n')}\n\nReply with a number to view details.`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

            if (!global.replyHandlers) global.replyHandlers = {};
            global.replyHandlers[sent.key.id] = {
                command: 'animewatch_select',
                handler: async (replyText, replyMessage) => {
                    const choice = Number(String(replyText || '').trim());
                    if (!Number.isInteger(choice) || choice < 1 || choice > list.length) {
                        return sock.sendMessage(from, { text: '❌ Invalid selection.' }, { quoted: replyMessage });
                    }
                    delete global.replyHandlers?.[sent.key.id];
                    const selected = list[choice - 1];
                    await sock.sendMessage(from, { text: `📖 Fetching details for ${cleanTitle(selected.title)}...` }, { quoted: replyMessage });

                    try {
                        const detail = await anoboy('detail', { query, url: selected.url });
                        const episodes = sortedEpisodes(detail.episode_list || []);
                        const genres = Array.isArray(detail.genres) ? detail.genres.join(', ') : 'N/A';
                        const chars = Array.isArray(detail.characters)
                            ? detail.characters.slice(0, 5).map((c) => `${c.name}${c.role ? ` (${c.role})` : ''}`).join(', ')
                            : '';

                        const text = [
                            `🎬 *${cleanTitle(detail.title || selected.title)}*`,
                            `📺 Type: ${detail.type || 'N/A'} | Status: ${detail.status || 'N/A'}`,
                            `⭐ Rating: ${detail.rating_percent ? `${detail.rating_percent}%` : detail.rating || 'N/A'}`,
                            `🎞️ Episodes: ${detail.episodes_total || episodes.length || 'N/A'}`,
                            `📅 Released: ${detail.released || 'N/A'} | Season: ${detail.season || 'N/A'}`,
                            `🏢 Studio: ${detail.studio || 'N/A'}`,
                            `🏷️ Genres: ${genres}`,
                            chars ? `👥 Characters: ${chars}` : '',
                            '',
                            `📝 ${truncate(detail.synopsis || 'No synopsis available.', 850)}`,
                            '',
                            episodes.length
                                ? `📥 *Episodes*\n${episodes.slice(0, 24).map((ep, i) => `${i + 1}. Ep ${ep.episode || i + 1} — ${cleanTitle(ep.title || '')}`).join('\n')}`
                                : '❌ No episodes found.',
                            '',
                            episodes.length ? 'Reply with an episode number to watch/download.' : ''
                        ].filter(Boolean).join('\n');

                        const detailMsg = await sock.sendMessage(from, detail.thumbnail ? {
                            image: { url: detail.thumbnail },
                            caption: text
                        } : { text }, { quoted: replyMessage });

                        if (episodes.length) {
                            global.replyHandlers[detailMsg.key.id] = {
                                command: 'animewatch_episode',
                                handler: async (epReply, epReplyMessage) => {
                                    const epChoice = Number(String(epReply || '').trim());
                                    if (!Number.isInteger(epChoice) || epChoice < 1 || epChoice > Math.min(episodes.length, 24)) {
                                        return sock.sendMessage(from, { text: '❌ Invalid episode number.' }, { quoted: epReplyMessage });
                                    }
                                    delete global.replyHandlers?.[detailMsg.key.id];
                                    return sendEpisode(sock, from, epReplyMessage, detail.title || selected.title, episodes[epChoice - 1]);
                                }
                            };
                        }
                    } catch (error) {
                        return sock.sendMessage(from, { text: `❌ Detail failed: ${error.message}` }, { quoted: replyMessage });
                    }
                }
            };
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            return sock.sendMessage(from, { text: `❌ Anime search failed: ${error.message}` }, { quoted: message });
        }
    }
};
