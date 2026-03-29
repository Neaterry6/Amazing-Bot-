import axios from 'axios';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

async function tryApi(url) {
    const api = `https://apis.ostyado.space/api/downloader/mp3?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(api, { timeout: 20000 });
    const audio = data?.result?.download || data?.result?.url;
    if (!audio) throw new Error('No audio link in API response');
    await axios.head(audio, { timeout: 10000 });
    return { audio, title: data?.result?.title };
}

async function tryYtdl(url, videoId) {
    const outFile = path.join(os.tmpdir(), `ilom_${videoId}_${Date.now()}.mp3`);
    await fs.ensureDir(path.dirname(outFile));

    await new Promise((resolve, reject) => {
        const stream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
        const writer = fs.createWriteStream(outFile);
        stream.pipe(writer);
        stream.on('error', reject);
        writer.on('error', reject);
        writer.on('finish', resolve);
    });

    return outFile;
}

export default {
    name: 'play',
    aliases: ['song', 'sing', 'music'],
    category: 'media',
    description: 'Download and send MP3 from YouTube query/link with API + ytdl fallback',
    usage: 'play <song name|youtube link>',
    example: 'play faded\nplay https://youtu.be/dQw4w9WgXcQ',
    cooldown: 8,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) {
            return await sock.sendMessage(from, {
                text: '❌ Example:\n.play faded\n.play https://youtu.be/dQw4w9WgXcQ'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            let url = text;
            let title = '';
            let thumbnail = '';

            if (!/youtu\.be|youtube\.com/i.test(text)) {
                const search = await yts(text);
                const video = search?.videos?.[0];
                if (!video) {
                    await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                    return await sock.sendMessage(from, { text: '❌ Song not found.' }, { quoted: message });
                }
                url = video.url;
                title = video.title;
                thumbnail = video.thumbnail;
            }

            const videoId = ytdl.getURLVideoID(url);
            let audioSource = null;
            let isBuffer = false;

            try {
                const result = await tryApi(url);
                audioSource = result.audio;
                title = title || result.title || 'Audio';
            } catch (apiError) {
                const filePath = await tryYtdl(url, videoId);
                audioSource = await fs.readFile(filePath);
                await fs.remove(filePath).catch(() => {});
                isBuffer = true;
            }

            const media = isBuffer ? audioSource : { url: audioSource };

            await sock.sendMessage(from, {
                audio: media,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: title || 'Audio',
                        body: 'ILOM Bot Downloader',
                        thumbnailUrl: thumbnail || undefined,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl: url
                    }
                }
            }, { quoted: message });

            await sock.sendMessage(from, {
                document: media,
                mimetype: 'audio/mpeg',
                fileName: `${(title || 'audio').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').slice(0, 50)}.mp3`
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('[PLAY] Error:', error.message);
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(from, { text: '❌ Error downloading mp3.' }, { quoted: message });
        }
    }
};
