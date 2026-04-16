import axios from 'axios';

const SEARCH_API = 'https://omegatech-api.dixonomega.tech/api/Search/bili';
const DL_API = 'https://omegatech-api.dixonomega.tech/api/download/bilidl';

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
                const dl = await axios.get(DL_API, { params: { url: pick.videoUrl }, timeout: 120000 });
                const payload = dl?.data || {};
                const mediaUrl = payload?.direct || payload?.media?.[0]?.url;
                if (!mediaUrl) return sock.sendMessage(from, { text: '❌ Download link not available.' }, { quoted: replyMessage });
                return sock.sendMessage(from, {
                    video: { url: mediaUrl },
                    caption: `🎬 ${payload.title || pick.title}`
                }, { quoted: replyMessage });
            }
        };
    }
};
