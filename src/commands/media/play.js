import axios from 'axios';
import yts from 'yt-search';

async function resolveYoutube(input) {
    if (/youtu\.be|youtube\.com/i.test(input)) return input;
    const search = await yts(input);
    const first = search?.videos?.[0];
    if (!first) throw new Error('Song not found');
    return first;
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
            if (!query) throw new Error('Please provide a song name');

            const resolved = await resolveYoutube(query);
            const video = typeof resolved === 'string' ? { url: resolved } : resolved;
            const url = video.url;
            const api = `https://apiskeith.top/download/audio?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.status || !data?.result) throw new Error('Audio not available');

            if (video?.title) {
                const details = [
                    '🎵 *Now Playing*',
                    `• Title: ${video.title || 'Unknown'}`,
                    `• Artist: ${video.author?.name || 'Unknown'}`,
                    `• Duration: ${video.timestamp || 'Unknown'}`,
                    `• Link: ${video.url}`
                ].join('\n');
                await sock.sendMessage(from, { text: details }, { quoted: message });
            }

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
