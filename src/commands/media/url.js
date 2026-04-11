import axios from 'axios';
import FormData from 'form-data';

export default {
    name: 'url',
    aliases: ['geturl', 'imageurl'],
    category: 'media',
    description: 'Upload a replied image to ImgBB and return a direct URL',
    usage: 'url (reply to image)',
    cooldown: 5,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, from }) {
        try {
            const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedImage = quoted?.imageMessage;
            const ownImage = message?.message?.imageMessage;
            const target = quotedImage
                ? { message: { imageMessage: quotedImage } }
                : ownImage
                    ? message
                    : null;

            if (!target) {
                return await sock.sendMessage(from, { text: '❌ Reply to an image (or send image with caption).' }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const imageBuffer = await sock.downloadMediaMessage(target);
            if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
                throw new Error('Could not read image data');
            }

            const apiKey = (process.env.IMGBB_API_KEY || '').trim();
            if (!apiKey) throw new Error('IMGBB_API_KEY is missing');

            const formData = new FormData();
            formData.append('image', imageBuffer.toString('base64'));

            const res = await axios.post(
                `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
                formData,
                { headers: formData.getHeaders(), timeout: 30000 }
            );

            const imageUrl = res?.data?.data?.url;
            if (!imageUrl) throw new Error('Upload succeeded but no URL was returned');

            await sock.sendMessage(from, {
                text: `✅ Image uploaded successfully!\n\n🔗 ${imageUrl}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
            return null;
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to upload image: ${error.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return null;
        }
    }
};
