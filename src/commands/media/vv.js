import { downloadContentFromMessage } from "@trashcore/baileys";

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
    name: 'vv',
    aliases: ['ex', 'viewonce', 'reveal'],
    category: 'media',
    description: 'Extract and resend view-once images, videos, or audio',
    usage: 'extract <reply to view-once media>',
    example: 'extract (reply to view-once)',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,

    async execute({ sock, message, from, sender, prefix }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return await sock.sendMessage(from, {
                text: '❌ Please reply to a view-once media message\n\n' +
                      '💡 Usage: ' + prefix + 'extract (reply to view-once)\n\n' +
                      '✅ Supports: Images, Videos, Audio'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            let type, mediaBuffer;

            if (quoted.imageMessage && quoted.imageMessage.viewOnce) {
                mediaBuffer = await downloadMedia(quoted);
                type = 'image';
            } else if (quoted.videoMessage && quoted.videoMessage.viewOnce) {
                mediaBuffer = await downloadMedia(quoted);
                type = 'video';
            } else if (quoted.audioMessage && quoted.audioMessage.viewOnce) {
                mediaBuffer = await downloadMedia(quoted);
                type = 'audio';
            } else if (quoted.imageMessage) {
                mediaBuffer = await downloadMedia(quoted);
                type = 'image';
            } else if (quoted.videoMessage) {
                mediaBuffer = await downloadMedia(quoted);
                type = 'video';
            } else if (quoted.audioMessage) {
                mediaBuffer = await downloadMedia(quoted);
                type = 'audio';
            } else {
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return await sock.sendMessage(from, {
                    text: '❌ Unsupported media type\n\n' +
                          '✅ Supported: View-once images, videos, audio'
                }, { quoted: message });
            }

            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error('Failed to download media');
            }

            if (type === 'image') {
                await sock.sendMessage(from, {
                    image: mediaBuffer,
                    caption: '🔓 View-Once Image Extracted\n\nExtracted by: @' + sender.split('@')[0],
                    mentions: [sender]
                }, { quoted: message });
            } else if (type === 'video') {
                await sock.sendMessage(from, {
                    video: mediaBuffer,
                    caption: '🔓 View-Once Video Extracted\n\nExtracted by: @' + sender.split('@')[0],
                    mentions: [sender]
                }, { quoted: message });
            } else if (type === 'audio') {
                await sock.sendMessage(from, {
                    audio: mediaBuffer,
                    mimetype: 'audio/mp4',
                    ptt: quoted.audioMessage?.ptt || false
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Extract media error:', error);
            
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });

            await sock.sendMessage(from, {
                text: '❌ Failed to extract media\n\n' +
                      '⚠️ Error: ' + error.message + '\n\n' +
                      '💡 Make sure you replied to:\n' +
                      '• View-once image\n' +
                      '• View-once video\n' +
                      '• View-once audio'
            }, { quoted: message });
        }
    }
};