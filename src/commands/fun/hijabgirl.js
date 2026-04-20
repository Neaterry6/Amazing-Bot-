import axios from 'axios';

export default {
    name: 'hijabgirl',
    category: 'fun',
    description: 'Fetch random hijabgirl media',
    usage: 'hijabgirl',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/hijabgirl', { timeout: 25000 });
            const payload = data?.result || data?.data || data;
            const url = payload?.url || payload?.image || payload?.link || payload?.result;
            if (!url) throw new Error('No media URL returned');
            return await sock.sendMessage(from, { image: { url }, caption: '✨ hijabgirl' }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ hijabgirl failed: ${error.message}` }, { quoted: message });
        }
    }
};
