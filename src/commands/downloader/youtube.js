import yts from 'yt-search';
import { fetchAllInOneDownload, fetchAllInOneFallback, parseAllInOneMeta, pickBestMedia } from '../../utils/allInOneDownloader.js';

async function getDownloadForType(videoUrl, type) {
    let payload;
    try {
        payload = await fetchAllInOneDownload(videoUrl);
    } catch (error) {
        if (error?.response?.status === 403 || /rapid/i.test(error?.message || '')) {
            payload = await fetchAllInOneFallback(videoUrl);
        } else {
            throw error;
        }
    }
    const link = pickBestMedia(payload, type === 'audio' ? 'audio' : 'video');
    if (!link) throw new Error('No downloadable media link returned by API');
    const meta = parseAllInOneMeta(payload);
    return { link, meta };
}

export default {
    name: 'ytb',
    aliases: ['youtube', 'y', 'yt', 'ytsearch'],
    category: 'downloader',
    description: 'Search and download YouTube audio/video',
    usage: 'ytb <audio|video|-a|-v> <search query>',
    example: 'ytb audio baby girl joeboy\nytb -v shape of you',
    cooldown: 20,
    permissions: ['user'],
    args: true,
    minArgs: 2,

    async execute({ sock, message, args, from, sender }) {
        try {

            let type = null;
            if (['audio', '-a'].includes(args[0].toLowerCase())) {
                type = 'audio';
                args.shift();
            } else if (['video', '-v'].includes(args[0].toLowerCase())) {
                type = 'video';
                args.shift();
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ Use: .ytb <audio|video> <query>'
                }, { quoted: message });
            }

            const query = args.join(' ').trim();
            if (!query) {
                return await sock.sendMessage(from, { text: '❌ Please provide a search query.' }, { quoted: message });
            }

            const results = await yts(query);
            const videos = (results?.videos || []).slice(0, 5);
            if (!videos.length) {
                return await sock.sendMessage(from, { text: `❌ No results found for "${query}"` }, { quoted: message });
            }

            const listText = [
                `🎵 *YouTube ${type === 'audio' ? 'Audio' : 'Video'} Search*`,
                '',
                `📝 Query: ${query}`,
                '━━━━━━━━━━━━━━━━━━',
                ...videos.map((video, i) => `${i + 1}. *${video.title}*\n   ⏱️ ${video.timestamp} | 👤 ${video.author.name}`),
                '',
                'Reply with a number (1-5) to download.'
            ].join('\n');

            const sentMsg = await sock.sendMessage(from, { text: listText }, { quoted: message });

            if (!global.replyHandlers) global.replyHandlers = {};
            global.replyHandlers[sentMsg.key.id] = {
                command: 'ytb',
                handler: async (replyText, replyMessage) => {
                    try {
                        const choice = parseInt(replyText.trim(), 10);
                        if (Number.isNaN(choice) || choice < 1 || choice > videos.length) {
                            return await sock.sendMessage(from, { text: '❌ Invalid choice. Send 1-5.' }, { quoted: replyMessage });
                        }

                        const selected = videos[choice - 1];
                        const { link, meta } = await getDownloadForType(selected.url, type);
                        const title = meta.title || selected.title;
                        const artist = meta.artist || selected.author.name;

                        if (type === 'audio') {
                            await sock.sendMessage(from, {
                                audio: { url: link },
                                mimetype: 'audio/mpeg',
                                fileName: `${title}.mp3`,
                                ptt: false,
                                contextInfo: {
                                    externalAdReply: {
                                        title,
                                        body: artist,
                                        thumbnailUrl: meta.thumbnail || selected.thumbnail,
                                        mediaType: 1,
                                        renderLargerThumbnail: true
                                    }
                                }
                            }, { quoted: replyMessage });
                        } else {
                            await sock.sendMessage(from, {
                                video: { url: link },
                                mimetype: 'video/mp4',
                                fileName: `${title}.mp4`,
                                caption: `📺 *${title}*\n👤 ${artist}`
                            }, { quoted: replyMessage });
                        }
                    } catch (e) {
                        await sock.sendMessage(from, { text: `❌ Failed to process selection: ${e.message}` }, { quoted: replyMessage });
                    }
                }
            };
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ ytb failed: ${error.message}` }, { quoted: message });
        }
    }
};
