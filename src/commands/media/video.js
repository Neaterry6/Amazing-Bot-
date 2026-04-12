import yts from 'yt-search';
import { fetchAllInOneDownload, parseAllInOneMeta, pickBestMedia } from '../../utils/allInOneDownloader.js';

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
    description: 'Download and send MP4 using all-in-one API',
    usage: 'video <song name|youtube link>',
    cooldown: 6,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const query = args.join(' ').trim();
            const url = await resolveYoutube(query);
            const data = await fetchAllInOneDownload(url);
            const mediaUrl = pickBestMedia(data, 'video');
            if (!mediaUrl) throw new Error('Video not available');
            const meta = parseAllInOneMeta(data);

            await sock.sendMessage(from, {
                video: { url: mediaUrl },
                caption: `✅ Video downloaded\n\n🎬 ${meta.title}\n👤 ${meta.artist}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Video failed: ${error.message}` }, { quoted: message });
        }
    }
};
