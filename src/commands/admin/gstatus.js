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
        let statusJidList = [];

        try {
            const metadata = await sock.groupMetadata(from);
            statusJidList = (metadata?.participants || [])
                .map((participant) => participant?.id)
                .filter((jid) => typeof jid === 'string' && jid.endsWith('@s.whatsapp.net'));
        } catch {}

        if (!statusJidList.length) {
            return await sock.sendMessage(from, {
                text: '❌ Could not resolve group members for status audience.'
            }, { quoted: message });
        }

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

        await sock.sendMessage('status@broadcast', payload, { statusJidList });
        await sock.sendMessage(from, { text: '✅ Uploaded to status successfully.' }, { quoted: message });
    }
};
