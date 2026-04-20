import axios from 'axios';

export default {
    name: 'animesearch',
    aliases: ['animefind', 'anime-title', 'animedetail', 'animedl', 'animedownload'],
    category: 'fun',
    description: 'Search anime, fetch details, and download episodes via Prexzy API',
    usage: 'animesearch <title> | animedetail <url> | animedownload <url>',
    args: false,
    minArgs: 0,
    cooldown: 4,

    async execute({ sock, message, args, from, prefix }) {
        try {
            const quotedText = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
                || message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text
                || '';
            const commandToken = (message?.message?.conversation || message?.message?.extendedTextMessage?.text || '')
                .trim()
                .split(/\s+/)[0]
                .replace(/^[./!#]/, '')
                .toLowerCase();
            const isDetail = ['animedetail'].includes(commandToken);
            const isDownload = ['animedl', 'animedownload'].includes(commandToken);
            const input = args.join(' ').trim() || String(quotedText).trim();

            if (!input) {
                return await sock.sendMessage(from, {
                    text: [
                        '🍥 *Anime Tools*',
                        `${prefix}animesearch <title>`,
                        `${prefix}animedetail <url>`,
                        `${prefix}animedownload <url>`,
                        '',
                        'Tip: you can also reply to a bot anime result with animedetail/animedownload.'
                    ].join('\n')
                }, { quoted: message });
            }

            if (isDetail) {
                const { data } = await axios.get('https://apis.prexzyvilla.site/anime/animedetail', {
                    params: { url: input },
                    timeout: 35000
                });
                const payload = data?.result || data?.data || data;
                const title = payload?.title || payload?.name || 'Unknown';
                const synopsis = payload?.synopsis || payload?.description || 'No synopsis.';
                const cover = payload?.image || payload?.thumbnail || payload?.poster;
                const episodes = Array.isArray(payload?.episodes) ? payload.episodes.slice(0, 15) : [];
                const text = [
                    `🎬 *${title}*`,
                    `${synopsis}`.slice(0, 1000),
                    '',
                    episodes.length ? '*Episodes*' : '*No episode list returned*',
                    ...episodes.map((ep, i) => `${i + 1}. ${ep?.title || ep?.name || 'Episode'}${ep?.url ? `\n   🔗 ${ep.url}` : ''}`)
                ].join('\n');

                if (cover) return await sock.sendMessage(from, { image: { url: cover }, caption: text }, { quoted: message });
                return await sock.sendMessage(from, { text }, { quoted: message });
            }

            if (isDownload) {
                await sock.sendMessage(from, { text: '⏳ Fetching anime download link...' }, { quoted: message });
                const { data } = await axios.get('https://apis.prexzyvilla.site/anime/animedownload', {
                    params: { url: input },
                    timeout: 45000
                });
                const payload = data?.result || data?.data || data;
                const fileUrl = payload?.download || payload?.url || payload?.file;
                const title = payload?.title || payload?.name || 'anime-episode';
                if (!fileUrl) {
                    return await sock.sendMessage(from, { text: '❌ No downloadable anime file URL found.' }, { quoted: message });
                }
                return await sock.sendMessage(from, {
                    document: { url: fileUrl },
                    mimetype: 'video/mp4',
                    fileName: `${title}.mp4`,
                    caption: `✅ Anime sent as file\n${title}`
                }, { quoted: message });
            }

            const { data } = await axios.get('https://apis.prexzyvilla.site/anime/animesearch', {
                params: { query: input },
                timeout: 30000
            });
            const list = data?.result || data?.data || data?.results || [];
            if (!Array.isArray(list) || !list.length) {
                return await sock.sendMessage(from, { text: `❌ No anime found for "${input}".` }, { quoted: message });
            }

            const text = [
                `🍥 *Anime Search Results*`,
                `Query: ${input}`,
                '',
                ...list.slice(0, 10).map((row, i) => {
                    const title = row?.title || row?.name || 'Unknown';
                    const type = row?.type || row?.format || 'N/A';
                    const year = row?.year || row?.release || 'N/A';
                    const url = row?.url || row?.link || '';
                    return `${i + 1}. *${title}*\n   • Type: ${type}\n   • Year: ${year}${url ? `\n   • URL: ${url}` : ''}`;
                })
            ].join('\n');

            await sock.sendMessage(from, { text }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ animesearch failed: ${error.message}` }, { quoted: message });
        }
    }
};
