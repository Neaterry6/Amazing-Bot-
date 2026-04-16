import axios from 'axios';

const CATEGORIES = ['waifu', 'neko', 'trap', 'blowjob'];

export default {
    name: 'nsfw',
    aliases: ['hentai', 'hgen'],
    category: 'ai',
    description: 'NSFW image generator by category',
    usage: 'nsfw <waifu|neko|trap|blowjob>',
    cooldown: 3,

    async execute({ sock, message, from, args }) {
        const category = (args[0] || 'waifu').toLowerCase();
        if (!CATEGORIES.includes(category)) {
            return sock.sendMessage(from, { text: `❌ Invalid category. Use: ${CATEGORIES.join(', ')}` }, { quoted: message });
        }

        const { data } = await axios.get(`https://api.waifu.pics/nsfw/${category}`, { timeout: 45000 });
        if (!data?.url) throw new Error('No image returned');

        await sock.sendMessage(from, {
            image: { url: data.url },
            caption: `🔞 NSFW • ${category}`
        }, { quoted: message });
    }
};
