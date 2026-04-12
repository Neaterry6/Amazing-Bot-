export default {
    name: 'tomp4',
    aliases: ['tovideo', 'mp4'],
    category: 'media',
    description: 'Convert/re-send replied video as mp4',
    usage: 'tomp4 (reply to video)',
    cooldown: 5,

    async execute({ sock, message, from }) {
        const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const source = quoted?.videoMessage ? { message: { videoMessage: quoted.videoMessage } } : message?.message?.videoMessage ? message : null;

        if (!source) {
            return await sock.sendMessage(from, { text: '❌ Reply to a video (or send one with caption).' }, { quoted: message });
        }

        try {
            const buffer = await sock.downloadMediaMessage(source);
            await sock.sendMessage(from, {
                video: buffer,
                mimetype: 'video/mp4',
                caption: '✅ Here is your MP4.'
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: message });
        }
    }
};
