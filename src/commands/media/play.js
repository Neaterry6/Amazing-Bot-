import yts from 'yt-search';
import axios from 'axios';

export default {
    name: 'play',
    aliases: ['song', 'sing', 'music'],
    category: 'media',
    description: 'Search YouTube song and send MP3',
    usage: 'play <song name|youtube link>',
    cooldown: 6,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const query = args.join(' ').trim();
            if (!query) throw new Error('🎵 Provide a song name');

            await sock.sendMessage(from, { react: { text: '🎶', key: message.key } });

            const search = await yts(query);
            if (!search?.videos?.length) {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                return await sock.sendMessage(from, { text: '❌ No results found' }, { quoted: message });
            }

            const video = search.videos[0];
            const apiUrl = 'https://api.ootaizumi.web.id/downloader/youtube';
            const { data } = await axios.get(apiUrl, {
                params: {
                    url: video.url,
                    format: 'mp3'
                },
                timeout: 40000
            });

            if (!data?.status || !data?.result?.download) {
                throw new Error('Download failed');
            }

            const result = data.result;
            const detailText = [
                '🎵 *PLAY RESULT*',
                `📝 *Title:* ${result.title || video.title || 'Unknown'}`,
                `👤 *Channel:* ${result.author?.channelTitle || video.author?.name || 'Unknown'}`,
                `⏱️ *Duration:* ${video.timestamp || 'Unknown'}`,
                `👀 *Views:* ${Number(video.views || 0).toLocaleString()}`,
                `🔗 *URL:* ${video.url}`
            ].join('\n');
            await sock.sendMessage(from, { text: detailText }, { quoted: message });

            await sock.sendMessage(from, {
                audio: { url: result.download },
                mimetype: 'audio/mpeg',
                fileName: `${(result.title || video.title || 'audio').replace(/[\\/:*?"<>|]/g, '').slice(0, 120)}.mp3`,
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: result.title || video.title || 'YouTube Audio',
                        body: result.author?.channelTitle || video.author?.name || 'YouTube',
                        thumbnailUrl: result.thumbnail || video.thumbnail,
                        sourceUrl: video.url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Play failed: ${error.message}` }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
