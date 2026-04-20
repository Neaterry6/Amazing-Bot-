import { downloadContentFromMessage } from '@whiskeysockets/baileys';

async function streamToBuffer(stream) {
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

export default {
    name: 'tomp4',
    aliases: ['tovideo', 'mp4'],
    category: 'media',
    description: 'Convert/re-send replied video as mp4',
    usage: 'tomp4 (reply to video)',
    cooldown: 5,

    async execute({ sock, message, from }) {
        const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const direct = message?.message || {};
        const mediaObject = quoted?.videoMessage
            || quoted?.documentMessage
            || direct?.videoMessage
            || direct?.documentMessage
            || null;

        const mime = String(mediaObject?.mimetype || '').toLowerCase();
        const mediaType = mediaObject === quoted?.videoMessage || mediaObject === direct?.videoMessage
            ? 'video'
            : (mime.startsWith('video/') || mime.includes('mp4') || mime.includes('webm'))
                ? 'document'
                : null;

        if (!mediaObject || !mediaType) {
            return await sock.sendMessage(from, { text: '❌ Reply to a video (or send one with caption).' }, { quoted: message });
        }

        try {
            const stream = await downloadContentFromMessage(mediaObject, mediaType);
            const buffer = await streamToBuffer(stream);
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
