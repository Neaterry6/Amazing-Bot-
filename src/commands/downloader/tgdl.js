import axios from 'axios';

export default {
    name: 'tgdl',
    aliases: ['telegramdl', 'tgmedia'],
    category: 'downloader',
    description: 'Download Telegram media from post link',
    usage: 'tgdl <telegram-link>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const url = args[0];
            const api = `https://apiskeith.top/download/telegram?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.status || !data?.result) throw new Error('No download result');

            const mediaUrl = data.result;
            const isVideo = /\.mp4|video/i.test(mediaUrl);
            if (isVideo) {
                await sock.sendMessage(from, { video: { url: mediaUrl }, caption: '✅ Telegram media' }, { quoted: message });
            } else {
                await sock.sendMessage(from, { document: { url: mediaUrl }, fileName: 'telegram-media' }, { quoted: message });
            }
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ tgdl failed: ${error.message}` }, { quoted: message });
        }
    }
};
