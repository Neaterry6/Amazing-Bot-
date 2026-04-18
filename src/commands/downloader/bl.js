import axios from 'axios';

const SEARCH_API = 'https://omegatech-api.dixonomega.tech/api/Search/bili';
const DL_API = 'https://omegatech-api.dixonomega.tech/api/download/bilidl';
function delay(ms = 1200) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export default {
    name: 'bl',
    aliases: ['bili', 'bilibili'],
    category: 'downloader',
    description: 'Search and download Bilibili videos',
    usage: 'bl <query>',
    minArgs: 1,
    cooldown: 8,

    async execute({ sock, message, from, args }) {
        const query = args.join(' ').trim();
        const { data } = await axios.get(SEARCH_API, { params: { q: query }, timeout: 60000 });
        const items = (data?.results || []).slice(0, 10);
        if (!items.length) return sock.sendMessage(from, { text: '❌ No result found.' }, { quoted: message });

        const text = ['🎬 Bilibili Search', '', ...items.map((v, i) => `${i + 1}. ${v.title}\n⏱ ${v.duration} • 👤 ${v.uploader}`), '', 'Reply with number to download'].join('\n');
        const sent = await sock.sendMessage(from, { text }, { quoted: message });

        if (!global.replyHandlers) global.replyHandlers = {};
        global.replyHandlers[sent.key.id] = {
            command: 'bl',
            handler: async (replyText, replyMessage) => {
                const n = Number.parseInt(String(replyText || '').trim(), 10);
                if (!n || n < 1 || n > items.length) return sock.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: replyMessage });
                const pick = items[n - 1];
                await sock.sendMessage(from, { text: '⏳ Preparing download...' }, { quoted: replyMessage });
                await delay(1400);
                const dl = await axios.get(DL_API, { params: { url: pick.videoUrl }, timeout: 120000 });
                const payload = dl?.data || {};
                const mediaUrls = [
                    payload?.direct,
                    ...(Array.isArray(payload?.media) ? payload.media.map((m) => m?.url).filter(Boolean) : []),
                    ...(Array.isArray(payload?.videos) ? payload.videos.map((m) => m?.url || m).filter(Boolean) : []),
                    ...(Array.isArray(payload?.result) ? payload.result.map((m) => m?.url || m).filter(Boolean) : [])
                ].filter(Boolean);
                if (!mediaUrls.length) return sock.sendMessage(from, { text: '❌ Download link not available.' }, { quoted: replyMessage });
                const uniqueUrls = [...new Set(mediaUrls)].slice(0, 2);
                for (let i = 0; i < uniqueUrls.length; i++) {
                    const fileName = `${(payload.title || pick.title || 'bilibili').replace(/[\\/:*?"<>|]/g, '').slice(0, 80)}_${i + 1}.mp4`;
                    try {
                        await sock.sendMessage(from, {
                            video: { url: uniqueUrls[i] },
                            mimetype: 'video/mp4',
                            fileName,
                            caption: i === 0 ? `🎬 ${payload.title || pick.title}` : undefined
                        }, { quoted: replyMessage });
                    } catch {
                        await sock.sendMessage(from, {
                            document: { url: uniqueUrls[i] },
                            mimetype: 'video/mp4',
                            fileName,
                            caption: i === 0 ? `🎬 ${payload.title || pick.title}` : undefined
                        }, { quoted: replyMessage });
                    }
                }
                return null;
            }
        };
    }
};
