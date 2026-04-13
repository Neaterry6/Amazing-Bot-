import { downloadContentFromMessage } from '@whiskeysockets/baileys';

async function downloadMedia(msg) {
    const messageType = Object.keys(msg)[0];
    const stream = await downloadContentFromMessage(msg[messageType], messageType.replace('Message', ''));
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

export default {
    name: 'vv2',
    category: 'media',
    description: 'Extract view-once media and send it directly to the author of the quoted media',
    usage: 'vv2 (reply to image/video/audio)',
    cooldown: 5,

    async execute({ sock, message, from }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const targetUser = ctx?.participant;

        if (!quoted || !targetUser) {
            return await sock.sendMessage(from, { text: '❌ Reply to a media message so I can send it back to that user.' }, { quoted: message });
        }

        try {
            let type;
            if (quoted.imageMessage) type = 'image';
            else if (quoted.videoMessage) type = 'video';
            else if (quoted.audioMessage) type = 'audio';
            else return await sock.sendMessage(from, { text: '❌ Reply to image/video/audio only.' }, { quoted: message });

            const mediaBuffer = await downloadMedia(quoted);
            if (!mediaBuffer?.length) throw new Error('No media extracted');

            if (type === 'image') {
                await sock.sendMessage(targetUser, { image: mediaBuffer, caption: '🔓 vv2 extracted media' }, { quoted: message });
            } else if (type === 'video') {
                await sock.sendMessage(targetUser, { video: mediaBuffer, caption: '🔓 vv2 extracted media' }, { quoted: message });
            } else {
                await sock.sendMessage(targetUser, { audio: mediaBuffer, mimetype: 'audio/mp4', ptt: quoted.audioMessage?.ptt || false }, { quoted: message });
            }

            await sock.sendMessage(from, { text: `✅ Sent extracted media to @${targetUser.split('@')[0]}`, mentions: [targetUser] }, { quoted: message });
        } catch (e) {
            await sock.sendMessage(from, { text: `❌ vv2 failed: ${e.message}` }, { quoted: message });
        }
    }
};
