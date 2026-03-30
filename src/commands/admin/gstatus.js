export default {
    name: 'gstatus',
    aliases: ['gcstatus'],
    category: 'admin',
    description: 'Upload replied image/video to WhatsApp status (group-admin only)',
    usage: 'gstatus (reply image/video)',
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;

        if (!quoted?.imageMessage && !quoted?.videoMessage) {
            return await sock.sendMessage(from, { text: '❌ Reply to an image or video first.' }, { quoted: message });
        }

        if (quoted?.imageMessage) {
            const imageBuffer = await sock.downloadMediaMessage({ message: { imageMessage: quoted.imageMessage } });
            await sock.sendMessage('status@broadcast', { image: imageBuffer, caption: quoted.imageMessage.caption || '' }, { statusJidList: [from] });
        } else {
            const videoBuffer = await sock.downloadMediaMessage({ message: { videoMessage: quoted.videoMessage } });
            await sock.sendMessage('status@broadcast', { video: videoBuffer, caption: quoted.videoMessage.caption || '' }, { statusJidList: [from] });
        }

        await sock.sendMessage(from, { text: '✅ Uploaded to status successfully.' }, { quoted: message });
    }
};
