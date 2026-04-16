import axios from 'axios';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { uploadToImgBB } from '../../utils/imgbb.js';

function delay(ms = 1800) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export default {
    name: 'nano',
    aliases: ['nanogen'],
    category: 'ai',
    description: 'Nano image-to-image edit. Reply to image with prompt.',
    usage: 'nano <prompt> (reply to image)',
    minArgs: 1,
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        const prompt = args.join(' ').trim();
        const quotedImage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        const directImage = message.message?.imageMessage;

        if (!prompt) return sock.sendMessage(from, { text: '❌ Provide prompt.' }, { quoted: message });
        if (!quotedImage && !directImage) {
            return sock.sendMessage(from, { text: '❌ Reply to an image with: .nano <prompt>' }, { quoted: message });
        }

        await sock.sendMessage(from, { text: '🛠️ Uploading image and creating Nano task...' }, { quoted: message });
        await delay(2200);

        const target = quotedImage ? { message: { imageMessage: quotedImage } } : message;
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
        const publicUrl = await uploadToImgBB(buffer);

        const { data } = await axios.get('https://omegatech-api.dixonomega.tech/api/ai/nano-banana2', {
            params: { image: publicUrl, prompt },
            timeout: 120000
        });

        const taskId = data?.task_id;
        const image = data?.image || data?.result?.image;
        if (image) {
            return sock.sendMessage(from, { image: { url: image }, caption: `✅ Nano result\nPrompt: ${prompt}` }, { quoted: message });
        }

        return sock.sendMessage(from, {
            text: `✅ Nano task submitted\nTask ID: ${taskId || 'N/A'}\nStatus: ${data?.status || 'processing'}\nMessage: ${data?.message || 'Use task id to check result from provider.'}`
        }, { quoted: message });
    }
};
