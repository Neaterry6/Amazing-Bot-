import { downloadMediaMessage } from '@whiskeysockets/baileys';
import config from '../../config.js';
import { updateBotProfile } from '../../utils/botProfile.js';
import { uploadToImgBB } from '../../utils/imgbb.js';

function getImageTarget(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) return { message: { imageMessage: quoted.imageMessage } };
    if (message?.message?.imageMessage) return message;
    return null;
}

export default {
    name: 'setbotimg',
    aliases: ['setbotimage', 'setmenuimg', 'sethelpimg'],
    category: 'owner',
    description: 'Set the image used by help/menu commands from a replied image or URL',
    usage: 'setbotimg <image url> OR reply to an image with setbotimg',
    cooldown: 5,
    ownerOnly: true,

    async execute({ sock, message, args, from }) {
        try {
            let imageUrl = args.find((arg) => /^https?:\/\//i.test(arg));

            if (!imageUrl) {
                const target = getImageTarget(message);
                if (!target) {
                    return await sock.sendMessage(from, {
                        text: '❌ Reply to an image or provide an image URL.\n\nUsage: .setbotimg <url>'
                    }, { quoted: message });
                }

                await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });
                const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                if (!buffer?.length) throw new Error('Could not download replied image');
                imageUrl = await uploadToImgBB(buffer);
            }

            await updateBotProfile({ image: imageUrl });
            config.botThumbnail = imageUrl;
            process.env.BOT_THUMBNAIL = imageUrl;

            await sock.sendMessage(from, {
                image: { url: imageUrl },
                caption: '✅ Bot help/menu image updated.'
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            return await sock.sendMessage(from, {
                text: `❌ Failed to set bot image: ${error.message}`
            }, { quoted: message });
        }
    }
};
