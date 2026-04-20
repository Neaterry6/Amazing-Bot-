import axios from 'axios';

export default {
    name: 'tiktokgirl',
    category: 'fun',
    description: 'Fetch random tiktokgirl video',
    usage: 'tiktokgirl',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/tiktokgirl', { timeout: 30000 });
            const payload = data?.result || data?.data || data;
            const url = payload?.url || payload?.video || payload?.link || payload?.result;
            if (!url) throw new Error('No video URL returned');
            return await sock.sendMessage(from, { video: { url }, caption: '✨ tiktokgirl' }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ tiktokgirl failed: ${error.message}` }, { quoted: message });
        }
    }
};
