import axios from 'axios';
import yts from 'yt-search';

async function resolveYoutube(input) {
    if (/youtu\.be|youtube\.com/i.test(input)) return input;
    const search = await yts(input);
    const first = search?.videos?.[0];
    if (!first) throw new Error('Video not found');
    return first.url;
}

export default {
    name: 'video',
    aliases: ['ytmp4', 'videodl'],
    category: 'media',
    description: 'Download and send MP4 using apiskeith API',
    usage: 'video <song name|youtube link>',
    cooldown: 6,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const query = args.join(' ').trim();
            const url = await resolveYoutube(query);
            const api = `https://apiskeith.top/download/ytmp4?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.status || !data?.result) throw new Error('Video not available');

            await sock.sendMessage(from, {
                video: { url: data.result },
                caption: '✅ Video downloaded'
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Video failed: ${error.message}` }, { quoted: message });
        }
    }
};
