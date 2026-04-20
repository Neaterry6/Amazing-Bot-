import axios from 'axios';

export default {
    name: 'vietnamgirl',
    category: 'fun',
    description: 'Fetch random vietnamgirl media',
    usage: 'vietnamgirl',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/vietnamgirl', { timeout: 25000 });
            const payload = data?.result || data?.data || data;
            const url = payload?.url || payload?.image || payload?.link || payload?.result;
            if (!url) throw new Error('No media URL returned');
            return await sock.sendMessage(from, { image: { url }, caption: '✨ vietnamgirl' }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ vietnamgirl failed: ${error.message}` }, { quoted: message });
        }
    }
};
