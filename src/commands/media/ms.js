import axios from 'axios';

export default {
    name: 'ms',
    aliases: ['mangasearch', 'manga', 'searchmanga'],
    category: 'utility',
    description: 'Search for manga and display results with images.',
    usage: 'ms <query>',
    example: 'ms Gojo',
    cooldown: 7,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: Infinity,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from }) {
        const query = args.join(' ');

        if (!query.trim()) {
            return await sock.sendMessage(from, {
                text: '❗ Please provide a manga search query.'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const apiUrl = `https://arychauhann.onrender.com/api/mangasearch?query=${encodeURIComponent(query)}`;

            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const raw = response.data;
            const data = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.result)
                    ? raw.result
                    : Array.isArray(raw?.data)
                        ? raw.data
                        : [];

            if (!data.length) {
                throw new Error('No manga results found');
            }

            const best = data.find((item) => item?.image || item?.cover || item?.thumbnail) || data[0];
            const title = best?.title || best?.name || 'Untitled';
            const description = best?.description || best?.synopsis || 'No description available.';
            const imageUrl = best?.image || best?.cover || best?.thumbnail;
            const link = best?.link || best?.url || '';

            const caption = `📚 *Manga Search*\n` +
                `🔎 Query: ${query}\n\n` +
                `🔖 *${title}*\n` +
                `${description.substring(0, 240)}${description.length > 240 ? '...' : ''}` +
                `${link ? `\n\n🔗 ${link}` : ''}`;

            if (imageUrl) {
                await sock.sendMessage(from, {
                    image: { url: imageUrl },
                    caption
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, { text: caption }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (err) {
            console.error('Mangasearch command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Failed to search manga: ${err.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
