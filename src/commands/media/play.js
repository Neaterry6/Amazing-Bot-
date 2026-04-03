import axios from 'axios';
import yts from 'yt-search';

function extractVideoId(url) {
    const m = String(url).match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return m?.[1] || null;
}

async function resolveYoutube(input) {
    if (/youtu\.be|youtube\.com/i.test(input)) {
        return { url: input, title: 'YouTube Audio', thumbnail: extractVideoId(input) ? `https://i.ytimg.com/vi/${extractVideoId(input)}/hqdefault.jpg` : null };
    }
    const search = await yts(input);
    const first = search?.videos?.[0];
    if (!first) throw new Error('Song not found');
    return { url: first.url, title: first.title || 'YouTube Audio', thumbnail: first.thumbnail || null };
}

export default {
    name: 'play',
    aliases: ['song', 'sing', 'music'],
    category: 'media',
    description: 'Download and send MP3 using apiskeith API',
    usage: 'play <song name|youtube link>',
    cooldown: 6,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const query = args.join(' ').trim();
            const resolved = await resolveYoutube(query);
            const api = `https://apiskeith.top/download/audio?url=${encodeURIComponent(resolved.url)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.status || !data?.result) throw new Error('Audio not available');

            if (resolved.thumbnail) {
                await sock.sendMessage(from, {
                    image: { url: resolved.thumbnail },
                    caption: `🎵 ${resolved.title}`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                audio: { url: data.result },
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: resolved.title,
                        body: 'Audio Download',
                        thumbnailUrl: resolved.thumbnail || undefined,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl: resolved.url
                    }
                }
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Play failed: ${error.message}` }, { quoted: message });
        }
    }
};
