import axios from 'axios';

const BASE = 'https://arychauhann.onrender.com/api';

function pickUrl(obj) {
    if (!obj) return null;
    if (typeof obj === 'string' && /^https?:\/\//i.test(obj)) return obj;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = pickUrl(item);
            if (found) return found;
        }
        return null;
    }
    if (typeof obj === 'object') {
        const priorityKeys = ['url', 'result', 'video', 'image', 'download', 'data', 'output', 'file', 'link'];
        for (const key of priorityKeys) {
            if (key in obj) {
                const found = pickUrl(obj[key]);
                if (found) return found;
            }
        }
        for (const value of Object.values(obj)) {
            const found = pickUrl(value);
            if (found) return found;
        }
    }
    return null;
}

function pickText(obj) {
    if (!obj) return null;
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = pickText(item);
            if (found) return found;
        }
        return null;
    }
    if (typeof obj === 'object') {
        const priorityKeys = ['text', 'result', 'message', 'translation', 'ocr', 'data'];
        for (const key of priorityKeys) {
            if (key in obj) {
                const found = pickText(obj[key]);
                if (found && !/^https?:\/\//i.test(found)) return found;
            }
        }
        for (const value of Object.values(obj)) {
            const found = pickText(value);
            if (found && !/^https?:\/\//i.test(found)) return found;
        }
    }
    return null;
}

export default {
    name: 'ary',
    aliases: ['aryapi', 'aryanapi', 'animeapi'],
    category: 'utility',
    description: 'Use Aryan Chauhan image/video/ocr APIs',
    usage: 'ary <manga|fluxpro|animagine|maxstudio|animevideo|openltranslate|pentoprintocr> <prompt|url>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const action = String(args[0] || '').toLowerCase();
        const rest = args.slice(1).join(' ').trim();
        const isUrlAction = ['maxstudio', 'openltranslate', 'pentoprintocr'].includes(action);
        const isPromptAction = ['manga', 'fluxpro', 'animagine'].includes(action);

        if (!['manga', 'fluxpro', 'animagine', 'maxstudio', 'animevideo', 'openltranslate', 'pentoprintocr'].includes(action)) {
            return await sock.sendMessage(from, {
                text: '❌ Invalid action.\n\nUse:\n• ary manga <prompt>\n• ary fluxpro <prompt>\n• ary animagine <prompt>\n• ary maxstudio <imageUrl>\n• ary openltranslate <imageUrl>\n• ary pentoprintocr <imageUrl>\n• ary animevideo'
            }, { quoted: message });
        }

        if ((isUrlAction || isPromptAction) && !rest) {
            return await sock.sendMessage(from, {
                text: `❌ Missing ${isUrlAction ? 'image URL' : 'prompt'} for ${action}.`
            }, { quoted: message });
        }

        try {
            let endpoint = `${BASE}/${action}`;
            if (isPromptAction) endpoint += `?prompt=${encodeURIComponent(rest)}`;
            if (isUrlAction) endpoint += `?url=${encodeURIComponent(rest)}`;

            const { data } = await axios.get(endpoint, { timeout: 60000 });
            const mediaUrl = pickUrl(data);

            if (action === 'animevideo') {
                if (!mediaUrl) throw new Error('No video URL returned');
                return await sock.sendMessage(from, {
                    video: { url: mediaUrl },
                    caption: '🎬 Random Anime TikTok'
                }, { quoted: message });
            }

            if (['manga', 'fluxpro', 'animagine', 'maxstudio'].includes(action)) {
                if (!mediaUrl) throw new Error('No image URL returned');
                return await sock.sendMessage(from, {
                    image: { url: mediaUrl },
                    caption: `🖼️ ${action} result`
                }, { quoted: message });
            }

            const text = pickText(data);
            if (mediaUrl && /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(mediaUrl)) {
                return await sock.sendMessage(from, {
                    image: { url: mediaUrl },
                    caption: text ? `🧾 Result\n\n${text}` : '🧾 Result'
                }, { quoted: message });
            }

            return await sock.sendMessage(from, {
                text: text || JSON.stringify(data, null, 2).slice(0, 3500)
            }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, {
                text: `❌ API request failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
