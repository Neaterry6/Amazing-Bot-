import axios from 'axios';

function pickList(data) {
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
}

export default {
    name: 'movie',
    aliases: ['film', 'mv'],
    category: 'downloader',
    description: 'Search movies using apiskeith moviebox/dramabox',
    usage: 'movie <moviebox|dramabox> <query>',
    args: true,
    minArgs: 2,

    async execute({ sock, message, from, args }) {
        const source = (args[0] || '').toLowerCase();
        const query = args.slice(1).join(' ').trim();

        if (!['moviebox', 'dramabox'].includes(source)) {
            return await sock.sendMessage(from, { text: '❌ Usage: movie <moviebox|dramabox> <query>' }, { quoted: message });
        }

        try {
            const api = `https://apiskeith.top/${source}/search?q=${encodeURIComponent(query)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            const list = pickList(data);
            if (!list.length) return await sock.sendMessage(from, { text: `❌ No result for ${query}` }, { quoted: message });

            const text = list.slice(0, 10).map((it, i) => {
                const title = it.title || it.name || it.movie || it.drama || 'Unknown';
                const year = it.year || it.release || '';
                return `${i + 1}. ${title}${year ? ` (${year})` : ''}`;
            }).join('\n');

            await sock.sendMessage(from, { text: `🎬 *${source} results*\n\n${text}` }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Movie failed: ${error.message}` }, { quoted: message });
        }
    }
};
