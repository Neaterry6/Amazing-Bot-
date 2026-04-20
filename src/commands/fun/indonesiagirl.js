import axios from 'axios';

export default {
    name: 'indonesiagirl',
    category: 'fun',
    description: 'Fetch random indonesiagirl media',
    usage: 'indonesiagirl',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/indonesiagirl', { timeout: 25000 });
            const payload = data?.result || data?.data || data;
            const url = payload?.url || payload?.image || payload?.link || payload?.result;
            if (!url) throw new Error('No media URL returned');
            return await sock.sendMessage(from, { image: { url }, caption: '✨ indonesiagirl' }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ indonesiagirl failed: ${error.message}` }, { quoted: message });
        }
    }
};
