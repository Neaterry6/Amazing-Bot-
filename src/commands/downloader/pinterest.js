import axios from 'axios';

export default {
    name: 'pinterest',
    aliases: ['pin', 'pindl'],
    category: 'downloader',
    description: 'Download Pinterest media from pin URL',
    usage: 'pinterest <pin-url>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const pinUrl = args[0];
            const api = `https://apiskeith.top/download/pindl3?url=${encodeURIComponent(pinUrl)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.status || !data?.result) throw new Error('No media result found');

            const { thumb, video, image } = data.result;
            if (video) {
                return await sock.sendMessage(from, {
                    video: { url: video },
                    caption: '✅ Pinterest video'
                }, { quoted: message });
            }

            if (image || thumb) {
                return await sock.sendMessage(from, {
                    image: { url: image || thumb },
                    caption: '✅ Pinterest image'
                }, { quoted: message });
            }

            throw new Error('Unsupported Pinterest result');
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Pinterest failed: ${error.message}` }, { quoted: message });
        }
    }
};
