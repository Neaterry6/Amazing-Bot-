import axios from 'axios';

const SOURCES = [
    'https://arychauhann.onrender.com/api/sfmhentai',
    'https://arychauhann.onrender.com/api/hentai'
];

async function fetchVideoUrl(url) {
    const { data } = await axios.get(url, { timeout: 45000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return data?.video || data?.url || data?.result?.url || data?.data?.url || data?.data?.video || null;
}

export default {
    name: 'anivid',
    aliases: ['hentaivid', 'animevid'],
    category: 'ai',
    description: 'Fetch random anime video from configured APIs',
    usage: 'anivid',
    cooldown: 8,

    async execute({ sock, message, from }) {
        let mediaUrl = null;
        let used = '';
        for (const source of SOURCES) {
            try {
                mediaUrl = await fetchVideoUrl(source);
                if (mediaUrl) {
                    used = source;
                    break;
                }
            } catch {}
        }

        if (!mediaUrl) {
            return sock.sendMessage(from, { text: '❌ Failed to fetch video from API sources.' }, { quoted: message });
        }

        return sock.sendMessage(from, {
            video: { url: mediaUrl },
            caption: `✅ anivid\nsource: ${used}`
        }, { quoted: message });
    }
};
