import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { fileTypeFromBuffer } from 'file-type';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

function unwrap(raw = {}) {
    return raw?.ephemeralMessage?.message
        || raw?.viewOnceMessage?.message
        || raw?.viewOnceMessageV2?.message
        || raw;
}

function extractSource(message) {
    const quoted = unwrap(message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || {});
    const direct = unwrap(message?.message || {});
    const src = Object.keys(quoted).length ? quoted : direct;

    if (src.imageMessage) return { media: src.imageMessage, type: 'image', label: 'image' };
    if (src.stickerMessage) return { media: src.stickerMessage, type: 'sticker', label: 'sticker' };
    if (src.videoMessage) return { media: src.videoMessage, type: 'video', label: src.videoMessage.gifPlayback ? 'gif' : 'video' };
    if (src.documentMessage) {
        const mime = String(src.documentMessage.mimetype || '').toLowerCase();
        if (mime.startsWith('image/')) return { media: src.documentMessage, type: 'document', label: 'image document' };
        if (mime.startsWith('video/')) return { media: src.documentMessage, type: 'document', label: 'video document' };
    }
    return null;
}

function inferExt(fileType, mime = '') {
    if (fileType?.ext) return fileType.ext;
    const m = String(mime || '').toLowerCase();
    if (m.includes('webp')) return 'webp';
    if (m.includes('png')) return 'png';
    if (m.includes('gif')) return 'gif';
    if (m.includes('mp4')) return 'mp4';
    if (m.includes('webm')) return 'webm';
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
    return 'bin';
}

function convertToPng(inputBuffer, inExt) {
    return new Promise((resolve, reject) => {
        const stamp = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const inputPath = path.join(TEMP_DIR, `toimg_in_${stamp}.${inExt}`);
        const outputPath = path.join(TEMP_DIR, `toimg_out_${stamp}.png`);
        fs.writeFileSync(inputPath, inputBuffer);

        const cleanup = () => [inputPath, outputPath].forEach((p) => {
            try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
        });

        ffmpeg(inputPath)
            .outputOptions(['-frames:v 1'])
            .format('image2')
            .on('error', (err) => {
                cleanup();
                reject(err);
            })
            .on('end', () => {
                try {
                    const out = fs.readFileSync(outputPath);
                    cleanup();
                    resolve(out);
                } catch (err) {
                    cleanup();
                    reject(err);
                }
            })
            .save(outputPath);
    });
}

export default {
    name: 'toimg',
    aliases: ['toimage', 'topng'],
    category: 'media',
    description: 'Convert replied sticker, GIF, video, or image to an image',
    usage: 'toimg (reply to media)',
    cooldown: 5,

    async execute({ sock, message, from, prefix }) {
        const src = extractSource(message);
        if (!src) {
            return sock.sendMessage(from, {
                text: `❌ Reply to a sticker, GIF, video, or image first.\nExample: ${prefix}toimg`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } }).catch(() => {});
            const stream = await downloadContentFromMessage(src.media, src.type);
            const input = await streamToBuffer(stream);
            if (!input.length) throw new Error('Could not download media.');

            const fileType = await fileTypeFromBuffer(input);
            const ext = inferExt(fileType, src.media?.mimetype);
            const out = await convertToPng(input, ext);

            await sock.sendMessage(from, {
                image: out,
                mimetype: 'image/png',
                caption: `✅ Converted ${src.label} to image.`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } }).catch(() => {});
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            await sock.sendMessage(from, {
                text: `❌ Failed to convert to image: ${error.message}`
            }, { quoted: message });
        }
    }
};
