import axios from 'axios';

function delay(ms = 1800) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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

        const image = data?.image;
        if (!image) throw new Error('No image URL returned');

        await sock.sendMessage(from, {
            image: { url: image },
            caption: `✅ Nano Pro result\nPrompt: ${prompt}`
        }, { quoted: message });
    }
};
