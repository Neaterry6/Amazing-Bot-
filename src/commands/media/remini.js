import { downloadMediaMessage } from '@whiskeysockets/baileys';
import FormData from 'form-data';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
    name: 'remini',
    category: 'tools',
    description: 'Enhance image with Remini (reply to image)',
    usage: 'remini (reply to image)',
    cooldown: 15,

    async execute({ sock, message, from }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.imageMessage) {
            return await sock.sendMessage(from, { text: '❌ Reply to an image' }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { text: '⏳ Uploading image...' }, { quoted: message });

            const buffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                {
                    logger: sock?.logger,
                    reuploadRequest: sock?.updateMediaMessage
                }
            );

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', buffer, {
                filename: 'image.jpg',
                contentType: 'image/jpeg'
            });

            const uploadRes = await fetch('https://catbox.moe/user/api.php', {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });
            const imgUrl = (await uploadRes.text()).trim();

            if (!uploadRes.ok || !imgUrl.startsWith('https://')) throw new Error('Upload failed');

            await sleep(1500);

            const reminiUrl = `https://omegatech-api.dixonomega.tech/api/tools/remini?url=${encodeURIComponent(imgUrl)}`;
            const reminiRes = await fetch(reminiUrl);
            const json = await reminiRes.json();
            const enhancedUrl = json?.result || json?.url;

            if (!reminiRes.ok || !enhancedUrl) throw new Error('No enhanced image');

            await sock.sendMessage(from, { image: { url: enhancedUrl } }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ Remini failed' }, { quoted: message });
        }

        return null;
    }
};
