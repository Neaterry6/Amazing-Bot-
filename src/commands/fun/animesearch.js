import axios from 'axios';

export default {
    name: 'animesearch',
    aliases: ['animefind', 'anime-title'],
    category: 'fun',
    description: 'Search anime titles from AnimeLovers API',
    usage: 'animesearch <title>',
    args: true,
    minArgs: 1,
    cooldown: 4,

    async execute({ sock, message, args, from }) {
        try {
            const query = args.join(' ').trim();
            const url = `https://omegatech-api.dixonomega.tech/api/Anime/anime-search?query=${encodeURIComponent(query)}`;
            const { data } = await axios.get(url, { timeout: 25000 });
            const list = data?.result || data?.data || data?.results || [];
            if (!Array.isArray(list) || !list.length) {
                return await sock.sendMessage(from, { text: `❌ No anime found for "${query}".` }, { quoted: message });
            }

            const text = [
                `🍥 *Anime Search Results*`,
                `Query: ${query}`,
                '',
                ...list.slice(0, 10).map((row, i) => {
                    const title = row?.title || row?.name || 'Unknown';
                    const type = row?.type || row?.format || 'N/A';
                    const year = row?.year || row?.release || 'N/A';
                    return `${i + 1}. *${title}*\n   • Type: ${type}\n   • Year: ${year}`;
                })
            ].join('\n');

            await sock.sendMessage(from, { text }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ animesearch failed: ${error.message}` }, { quoted: message });
        }
    }
};
