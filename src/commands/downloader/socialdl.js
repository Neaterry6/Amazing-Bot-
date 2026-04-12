import { fetchAllInOneDownload, parseAllInOneMeta, pickBestMedia } from '../../utils/allInOneDownloader.js';

function detectCommand(message, fallback = 'fbdl') {
    const text = message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || '';
    const token = text.trim().split(/\s+/)[0].replace(/^[^a-zA-Z]+/, '').toLowerCase();
    return token || fallback;
}

export default {
    name: 'fbdl',
    aliases: ['fb', 'fbdownload', 'igdl', 'tkdl', 'ttdl', 'tiktokdl', 'instagramdl'],
    category: 'downloader',
    description: 'Download social media content (FB/IG/TikTok) via all-in-one API',
    usage: 'fbdl <url> | igdl <url> | tkdl <url>',
    cooldown: 8,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const url = args[0]?.trim();
            if (!/^https?:\/\//i.test(url || '')) {
                return await sock.sendMessage(from, { text: '❌ Send a valid URL.' }, { quoted: message });
            }

            const payload = await fetchAllInOneDownload(url);
            const media = pickBestMedia(payload, 'video') || pickBestMedia(payload, 'audio');
            if (!media) throw new Error('No downloadable media found');

            const meta = parseAllInOneMeta(payload);
            const cmd = detectCommand(message);
            const label = cmd.includes('ig') ? 'Instagram' : cmd.includes('tk') || cmd.includes('tt') ? 'TikTok' : 'Facebook';

            if (/\.mp3($|\?)/i.test(media)) {
                await sock.sendMessage(from, {
                    audio: { url: media },
                    mimetype: 'audio/mpeg',
                    fileName: `${meta.title}.mp3`,
                    ptt: false
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, {
                    video: { url: media },
                    mimetype: 'video/mp4',
                    caption: `✅ *${label} Download*\n\n🎬 ${meta.title}\n👤 ${meta.artist}`
                }, { quoted: message });
            }
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Download failed: ${error.message}` }, { quoted: message });
        }
    }
};
