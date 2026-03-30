import axios from 'axios';
import yts from 'yt-search';

async function resolveYoutube(input) {
    if (/youtu\.be|youtube\.com/i.test(input)) return input;
    const search = await yts(input);
    const first = search?.videos?.[0];
    if (!first) throw new Error('Song not found');
    return first.url;
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
            const url = await resolveYoutube(query);
            const api = `https://apiskeith.top/download/audio?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.status || !data?.result) throw new Error('Audio not available');

            await sock.sendMessage(from, {
                audio: { url: data.result },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Play failed: ${error.message}` }, { quoted: message });
        }
    }
};
