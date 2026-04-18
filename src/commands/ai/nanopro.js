import axios from 'axios';

function delay(ms = 1800) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function extractImageUrl(data = {}) {
    return data?.image
        || data?.url
        || data?.result?.image
        || data?.result?.url
        || data?.data?.image
        || data?.data?.url
        || '';
}

export default {
    name: 'nanopro',
    aliases: ['nano-pro'],
    category: 'ai',
    description: 'Nano Banana Pro text-to-image generation',
    usage: 'nanopro <prompt>',
    minArgs: 1,
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        const prompt = args.join(' ').trim();
        if (!prompt) return sock.sendMessage(from, { text: '❌ Provide prompt.' }, { quoted: message });

        await sock.sendMessage(from, { text: '🎨 Generating with Nano Banana Pro...' }, { quoted: message });
        await delay(2000);

        const { data } = await axios.get('https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro', {
            params: { prompt },
            timeout: 120000
        });

        const image = extractImageUrl(data);
        if (!image) {
            const taskId = data?.task_id || data?.key || data?.id || '';
            throw new Error(`No image URL returned${taskId ? ` (task: ${taskId})` : ''}`);
        }

        await sock.sendMessage(from, {
            image: { url: image },
            caption: `✅ Nano Pro result\nPrompt: ${prompt}`
        }, { quoted: message });
    }
};
