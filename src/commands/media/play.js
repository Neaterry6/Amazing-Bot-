import yts from 'yt-search';
import { fetchAllInOneDownload, parseAllInOneMeta, pickBestMedia } from '../../utils/allInOneDownloader.js';

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
    description: 'Download and send song audio with cover art',
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
            const data = await fetchAllInOneDownload(url);
            const mediaUrl = pickBestMedia(data, 'audio');
            if (!mediaUrl) throw new Error('Audio not available from API response');
            const meta = parseAllInOneMeta(data);

            const thumbnail = meta.thumbnail || video?.thumbnail;

            if (thumbnail) {
                await sock.sendMessage(from, {
                    image: { url: thumbnail },
                    caption: [
                        '🖼️ *Album Cover*',
                        `• Title: ${meta.title || video?.title || 'Unknown'}`,
                        `• Artist: ${meta.artist || video?.author?.name || 'Unknown'}`
                    ].join('\n')
                }, { quoted: message });
            }

            if (video?.title || meta.title) {
                const details = [
                    '🎵 *Now Playing*',
                    `• Title: ${meta.title || video.title || 'Unknown'}`,
                    `• Artist: ${meta.artist || video.author?.name || 'Unknown'}`,
                    `• Duration: ${meta.duration || video.timestamp || 'Unknown'}`,
                    `• Link: ${video.url || meta.sourceUrl || url}`
                ].join('\n');
                await sock.sendMessage(from, { text: details }, { quoted: message });
            }

            await sock.sendMessage(from, {
                audio: { url: mediaUrl },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Play failed: ${error.message}` }, { quoted: message });
        }
    }
};
