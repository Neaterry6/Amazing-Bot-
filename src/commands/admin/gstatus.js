import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
    name: 'togcstatus',
    aliases: ['gstatus', 'gcstatus'],
    category: 'admin',
    description: 'Upload replied image/video/audio to WhatsApp status (group-admin only)',
    usage: 'togcstatus (reply image/video/audio)',
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from }) {
        try {
            const ctx = message.message?.extendedTextMessage?.contextInfo;
            const quoted = ctx?.quotedMessage;
            const quotedKey = ctx?.stanzaId
                ? { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant }
                : undefined;

            const hasImage = Boolean(quoted?.imageMessage);
            const hasVideo = Boolean(quoted?.videoMessage);
            const hasAudio = Boolean(quoted?.audioMessage);

            if (!hasImage && !hasVideo && !hasAudio) {
                return await sock.sendMessage(from, { text: '❌ Reply to an image, video, or audio first.' }, { quoted: message });
            }

            let payload;

            if (hasImage) {
                const imageBuffer = await downloadMediaMessage(
                    { key: quotedKey, message: { imageMessage: quoted.imageMessage } },
                    'buffer',
                    {}
                );
                payload = { image: imageBuffer, caption: quoted.imageMessage.caption || '' };
            } else if (hasVideo) {
                const videoBuffer = await downloadMediaMessage(
                    { key: quotedKey, message: { videoMessage: quoted.videoMessage } },
                    'buffer',
                    {}
                );
                payload = { video: videoBuffer, caption: quoted.videoMessage.caption || '' };
            } else {
                const audioBuffer = await downloadMediaMessage(
                    { key: quotedKey, message: { audioMessage: quoted.audioMessage } },
                    'buffer',
                    {}
                );
                payload = {
                    audio: audioBuffer,
                    mimetype: quoted.audioMessage.mimetype || 'audio/mp4',
                    ptt: quoted.audioMessage.ptt || false
                };
            }

            const metadata = await sock.groupMetadata(from);
            const recipients = (metadata?.participants || [])
                .map((p) => p?.id)
                .filter((jid) => typeof jid === 'string' && jid !== sock.user?.id);

            if (!recipients.length) {
                return await sock.sendMessage(from, { text: '❌ Could not find group participants for status audience.' }, { quoted: message });
            }

            await sock.sendMessage('status@broadcast', payload, { statusJidList: recipients });
            await sock.sendMessage(from, {
                text: `✅ Uploaded to status for ${recipients.length} group participants.`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to upload status: ${error.message || 'Unknown error'}`
            }, { quoted: message });
        }
    }
};
