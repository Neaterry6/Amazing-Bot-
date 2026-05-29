import axios from 'axios';

function collectImageUrls(payload) {
    const urls = [];
    const visit = (value) => {
        if (!value) return;
        if (typeof value === 'string') {
            if (/^https?:\/\//i.test(value) && /\.(png|jpe?g|webp|gif)(\?|$)|image|cdn|ibb|http/i.test(value)) urls.push(value);
            return;
        }
        if (Array.isArray(value)) return value.forEach(visit);
        if (typeof value === 'object') {
            for (const key of ['url', 'image', 'image_url', 'imageUrl', 'output', 'result']) visit(value[key]);
            for (const item of Object.values(value)) visit(item);
        }
    };
    visit(payload?.images || payload?.data?.images || payload?.result?.images || payload?.results || payload?.data || payload?.result || payload);
    return [...new Set(urls)].slice(0, 4);
}

export default {
    name: 'imagine',
    aliases: ['texttoimage', 'tti', 'raphael'],
    category: 'ai',
    description: 'Generate images from text with Raphael AI',
    usage: 'imagine <prompt>',
    example: 'imagine a cow in a city 16k resolution',
    cooldown: 8,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    typing: true,

    async execute({ sock, message, args, from, prefix }) {
        const prompt = args.join(' ').trim();
        if (!prompt) {
            return await sock.sendMessage(from, {
                text: `⚠️ Please provide a prompt.\n\n📜 *Usage:* ${prefix}imagine <prompt>\n\n🎨 *Example:* ${prefix}imagine a beautiful sunset over mountains`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🎨', key: message.key } });
            const processingMsg = await sock.sendMessage(from, { text: '⏳ Generating your Raphael images...' }, { quoted: message });

            const { data } = await axios.get('https://omegatech-api.dixonomega.tech/api/ai/Raphael-text-to-image', {
                params: {
                    prompt,
                    aspect: '9:16',
                    model_id: 'raphael-basic',
                    number_of_images: 4,
                    highQuality: true,
                    fastMode: true,
                    isSafeContent: false,
                    autoTranslate: true
                },
                timeout: 120000,
                headers: { 'User-Agent': 'Asta-Bot/1.0' }
            });

            const urls = collectImageUrls(data);
            if (!urls.length) throw new Error(data?.message || data?.error || 'No image URL returned');

            await sock.sendMessage(from, { delete: processingMsg.key }).catch(() => {});
            for (let i = 0; i < urls.length; i++) {
                await sock.sendMessage(from, {
                    image: { url: urls[i] },
                    caption: `✅ Raphael image ${i + 1}/${urls.length}\nPrompt: ${prompt}`
                }, { quoted: i === 0 ? message : undefined });
            }
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Raphael image generation error:', error.message || error);
            await sock.sendMessage(from, {
                text: `❌ Failed to generate image: ${error.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
        }
    }
};
