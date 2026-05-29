import axios from 'axios';

const AIO_URL = 'https://omegatech-api-lscz.onrender.com/api/download/All-downloader-v2';

function pickMedia(result = {}) {
    const medias = Array.isArray(result.medias) ? result.medias : [];
    return medias.find((m) => /^https?:\/\//i.test(m?.url || '') && m?.type === 'video')
        || medias.find((m) => /^https?:\/\//i.test(m?.url || '') && m?.type === 'audio')
        || medias.find((m) => /^https?:\/\//i.test(m?.url || ''))
        || null;
}

function extToMime(extension = '', type = '') {
    const ext = String(extension || '').toLowerCase();
    if (type === 'audio' || ['mp3', 'm4a', 'wav', 'ogg'].includes(ext)) return 'audio/mpeg';
    if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'video/mp4';
}

export default {
    name: 'aio',
    aliases: ['alldl', 'all', 'allinone', 'all-downloader'],
    category: 'downloader',
    description: 'Download media from supported URLs using OmegaTech all downloader',
    usage: 'aio <url>',
    cooldown: 8,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, prefix }) {
        const url = args.join(' ').trim();
        if (!/^https?:\/\//i.test(url)) {
            return await sock.sendMessage(from, {
                text: `❌ Usage: ${prefix}aio <url>`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '📥', key: message.key } });
            const { data } = await axios.get(AIO_URL, {
                params: { url },
                timeout: 90000,
                headers: { 'User-Agent': 'Asta-Bot/1.0' }
            });

            if (!data?.success) throw new Error(data?.error || data?.message || 'All downloader API failed');
            const result = data.result || {};
            const media = pickMedia(result);
            if (!media) throw new Error('No downloadable media returned');

            const title = result.title || 'download';
            const author = result.author || result.source || 'Unknown';
            const caption = [
                `📥 *${title}*`,
                `👤 ${author}`,
                result.duration ? `⏱️ ${result.duration}` : '',
                `🔗 ${result.url || url}`
            ].filter(Boolean).join('\n');

            const mimetype = extToMime(media.extension, media.type);
            if (media.type === 'audio' || mimetype.startsWith('audio/')) {
                await sock.sendMessage(from, {
                    audio: { url: media.url },
                    mimetype,
                    fileName: `${String(title).replace(/[\\/:*?"<>|]/g, '').slice(0, 120)}.${media.extension || 'mp3'}`,
                    contextInfo: result.thumbnail ? {
                        externalAdReply: {
                            title,
                            body: author,
                            thumbnailUrl: result.thumbnail,
                            sourceUrl: result.url || url,
                            renderLargerThumbnail: true,
                            mediaType: 1
                        }
                    } : undefined
                }, { quoted: message });
            } else if (mimetype.startsWith('image/')) {
                await sock.sendMessage(from, { image: { url: media.url }, caption }, { quoted: message });
            } else {
                await sock.sendMessage(from, { video: { url: media.url }, mimetype, caption }, { quoted: message });
            }
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            return await sock.sendMessage(from, {
                text: `❌ AIO download failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
