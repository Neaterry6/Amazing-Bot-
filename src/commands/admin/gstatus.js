import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
    name: 'gcstatus',
    aliases: ['groupstatus', 'postgc', 'togcstatus', 'gstatus'],
    category: 'admin',
    description: 'Post replied text/image/video/audio to WhatsApp group status',
    usage: 'gcstatus [caption] (reply to text/image/video/audio)',
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from }) {
        try {
            const ctx = message.message?.extendedTextMessage?.contextInfo;
            const quoted = ctx?.quotedMessage;
            const quotedKey = ctx?.stanzaId
                ? { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant }
                : undefined;
            const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
            const commandToken = fullText.split(/\s+/)[0] || '';
            const extraCaption = fullText.slice(commandToken.length).trim();

            if (!quoted) {
                return await sock.sendMessage(from, {
                    text: [
                        '❌ *How to use:*',
                        '',
                        '1) Reply to a text/image/video/audio message',
                        '2) Send: `gcstatus`',
                        '3) Optional: add caption after the command',
                        '',
                        '*Examples:*',
                        '• `gcstatus`',
                        '• `gcstatus check this 🔥`'
                    ].join('\n')
                }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const hasText = Boolean(quoted?.conversation || quoted?.extendedTextMessage?.text);
            const hasImage = Boolean(quoted?.imageMessage);
            const hasVideo = Boolean(quoted?.videoMessage);
            const hasAudio = Boolean(quoted?.audioMessage);

            let payload;
            let successText = '';

            if (hasText) {
                const textContent = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
                const finalText = extraCaption ? `${textContent}\n\n${extraCaption}` : textContent;
                payload = {
                    text: finalText,
                    contextInfo: { isGroupStatus: true }
                };
                successText = '✅ Text posted to group status.';
            }

            if (!payload && hasImage) {
                const imageBuffer = await downloadMediaMessage(
                    { key: quotedKey, message: { imageMessage: quoted.imageMessage } },
                    'buffer',
                    {}
                );
                if (!imageBuffer) throw new Error('media-download-fail');
                payload = {
                    image: imageBuffer,
                    caption: extraCaption || '',
                    contextInfo: {
                        isGroupStatus: true,
                        pairedMediaType: 'NOT_PAIRED_MEDIA'
                    }
                };
                successText = '✅ Image posted to group status.';
            } else if (!payload && hasVideo) {
                const videoBuffer = await downloadMediaMessage(
                    { key: quotedKey, message: { videoMessage: quoted.videoMessage } },
                    'buffer',
                    {}
                );
                if (!videoBuffer) throw new Error('media-download-fail');
                const sizeInMB = videoBuffer.length / (1024 * 1024);
                if (sizeInMB > 30) {
                    await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                    return await sock.sendMessage(from, { text: '❌ Video too large. Max size is 30MB.' }, { quoted: message });
                }
                payload = {
                    video: videoBuffer,
                    caption: extraCaption || '',
                    gifPlayback: false,
                    contextInfo: {
                        isGroupStatus: true,
                        pairedMediaType: 'NOT_PAIRED_MEDIA'
                    }
                };
                successText = '✅ Video posted to group status.';
            } else if (!payload && hasAudio) {
                const audioBuffer = await downloadMediaMessage(
                    { key: quotedKey, message: { audioMessage: quoted.audioMessage } },
                    'buffer',
                    {}
                );
                if (!audioBuffer) throw new Error('media-download-fail');
                payload = {
                    audio: audioBuffer,
                    mimetype: quoted.audioMessage.mimetype || 'audio/mp4',
                    ptt: quoted.audioMessage.ptt || false,
                    contextInfo: {
                        isGroupStatus: true,
                        pairedMediaType: 'NOT_PAIRED_MEDIA'
                    }
                };
                successText = '✅ Audio posted to group status.';
            }

            if (!payload) {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                return await sock.sendMessage(from, {
                    text: '❌ Unsupported message type. Supported: text, image, video, audio.'
                }, { quoted: message });
            }

            await sock.sendMessage(from, payload);
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
            await sock.sendMessage(from, { text: successText }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            const lowered = String(error?.message || '').toLowerCase();
            let hint = error?.message || 'Unknown error';

            if (lowered.includes('not-authorized')) hint = 'Bot not authorized to post group status.';
            else if (lowered.includes('forbidden')) hint = 'Permission denied for group status.';
            else if (lowered.includes('media-download-fail')) hint = 'Media download failed.';

            await sock.sendMessage(from, {
                text: `❌ Failed to post status: ${hint}`
            }, { quoted: message });
        }
    }
};
