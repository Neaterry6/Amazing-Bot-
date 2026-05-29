import axios from 'axios';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { uploadToImgBB } from '../../utils/imgbb.js';

const CONVERT_API = 'https://omegatech-api.dixonomega.tech/api/tools/Image-converter';

function getImageTarget(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) return { message: { imageMessage: quoted.imageMessage }, mime: quoted.imageMessage.mimetype };
    if (message?.message?.imageMessage) return { message, mime: message.message.imageMessage.mimetype };
    return null;
}

function extFromMime(mime = '') {
    if (/png/i.test(mime)) return 'png';
    if (/webp/i.test(mime)) return 'webp';
    if (/gif/i.test(mime)) return 'gif';
    return 'jpeg';
}

async function resolveInput(sock, message, args) {
    const url = args.find((arg) => /^https?:\/\//i.test(arg));
    if (url) return { fileUrl: url, from: (url.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1] || 'jpeg').toLowerCase() };
    const target = getImageTarget(message);
    if (!target) return { fileUrl: '', from: 'jpeg' };
    const buffer = await downloadMediaMessage(target.message, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
    if (!buffer?.length) throw new Error('Could not download image');
    return { fileUrl: await uploadToImgBB(buffer), from: extFromMime(target.mime) };
}

export default {
    name: 'imageconvert',
    aliases: ['imgconvert', 'convertimage', 'toimage'],
    category: 'edit',
    description: 'Convert an image to another format such as png, jpg, webp, or gif',
    usage: 'imageconvert <to> [from] <imageUrl or reply image>',
    cooldown: 8,
    permissions: ['user'],

    async execute({ sock, message, args, from, prefix }) {
        try {
            const to = (args.find((arg) => /^(png|jpe?g|webp|gif|bmp|tiff)$/i.test(arg)) || '').toLowerCase().replace('jpg', 'jpeg');
            if (!to) {
                return await sock.sendMessage(from, {
                    text: `❌ Usage: ${prefix}imageconvert <png|jpeg|webp|gif> (reply image or add URL)`
                }, { quoted: message });
            }

            const explicitFrom = (args.find((arg) => /^from=(png|jpe?g|webp|gif|bmp|tiff)$/i.test(arg)) || '').split('=')[1]?.toLowerCase();
            const input = await resolveInput(sock, message, args);
            if (!input.fileUrl) {
                return await sock.sendMessage(from, {
                    text: `❌ Reply to an image or provide an image URL.\n\nUsage: ${prefix}imageconvert ${to}`
                }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '🔄', key: message.key } });
            const fromExt = (explicitFrom || input.from || 'jpeg').replace('jpg', 'jpeg');
            const { data } = await axios.get(CONVERT_API, {
                params: { fileUrl: input.fileUrl, from: fromExt, to },
                timeout: 120000,
                headers: { 'User-Agent': 'Asta-Bot/1.0' }
            });
            if (!data?.success || !data?.resultUrl) throw new Error(data?.message || data?.error || 'Image converter API failed');

            await sock.sendMessage(from, {
                document: { url: data.resultUrl },
                mimetype: data.mimeType || 'application/octet-stream',
                fileName: data.outputFilename || `converted.${to}`,
                caption: `✅ Converted ${fromExt} → ${to}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            return await sock.sendMessage(from, { text: `❌ Image convert failed: ${error.message}` }, { quoted: message });
        }
    }
};
