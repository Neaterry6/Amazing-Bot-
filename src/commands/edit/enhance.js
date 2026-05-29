import axios from 'axios';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { uploadToImgBB } from '../../utils/imgbb.js';

const ENHANCE_API = 'https://omegatech-api-lscz.onrender.com/api/tools/Image-upscaler';

function quotedImageTarget(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) return { message: { imageMessage: quoted.imageMessage } };
    if (message?.message?.imageMessage) return message;
    return null;
}

async function resolveImageUrl(sock, message, args) {
    const direct = args.find((arg) => /^https?:\/\//i.test(arg));
    if (direct) return direct;
    const target = quotedImageTarget(message);
    if (!target) return '';
    const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
    if (!buffer?.length) throw new Error('Could not download image');
    return await uploadToImgBB(buffer);
}

export default {
    name: 'enhance',
    aliases: ['upscale', 'upscaler', 'hdimage', 'remini'],
    category: 'edit',
    description: 'Enhance/upscale an image to 4K or 8K with optional face enhancement',
    usage: 'enhance [4k|8k] [face] <imageUrl or reply image>',
    cooldown: 10,
    permissions: ['user'],

    async execute({ sock, message, args, from, prefix }) {
        try {
            const quality = args.find((arg) => /^(4k|8k)$/i.test(arg))?.toLowerCase() || '8k';
            const faceEnhance = args.some((arg) => /^(face|face=true|true)$/i.test(arg));
            const imageUrl = await resolveImageUrl(sock, message, args);
            if (!imageUrl) {
                return await sock.sendMessage(from, {
                    text: `❌ Reply to an image or provide an image URL.\n\nUsage: ${prefix}enhance [4k|8k] [face]`
                }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '✨', key: message.key } });
            const { data } = await axios.get(ENHANCE_API, {
                params: { imageUrl, quality, faceEnhance },
                timeout: 120000,
                headers: { 'User-Agent': 'Asta-Bot/1.0' }
            });
            if (!data?.success || !data?.resultUrl) throw new Error(data?.message || data?.error || 'Enhance API failed');

            await sock.sendMessage(from, {
                image: { url: data.resultUrl },
                caption: `✅ *Image Enhanced*\nQuality: ${data.quality || quality.toUpperCase()}\nScale: ${data.scale || 'N/A'}\nFace Enhance: ${data.faceEnhance ? 'ON' : 'OFF'}\nTime: ${data.processingTime || 'N/A'}ms`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            return await sock.sendMessage(from, { text: `❌ Enhance failed: ${error.message}` }, { quoted: message });
        }
    }
};
