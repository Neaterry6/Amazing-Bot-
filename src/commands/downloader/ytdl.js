import ytdl from 'ytdl-core';
import fs from 'fs-extra';
import path from 'path';





export default {
    name: 'ytmp3',
    aliases: ['ytdl', 'youtube', 'yta'],
    category: 'downloader',
    description: 'Download YouTube video as audio',
    usage: 'ytmp3 <youtube_url>',
    cooldown: 10,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute(sock, message, args) {
        const url = args[0];
        
        if (!ytdl.validateURL(url)) {
            return sock.sendMessage(message.key.remoteJid, {
                text: '❌ Please provide a valid YouTube URL!'
            });
        }

        try {
            await sock.sendMessage(message.key.remoteJid, {
                text: '🔄 *Downloading audio...*\n\nPlease wait, this may take a few minutes.'
            });

            const info = await ytdl.getInfo(url);
            const title = info.videoDetails.title;
            const duration = info.videoDetails.lengthSeconds;
            
            if (duration > 600) {
                return sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Video is too long! Maximum duration is 10 minutes.'
                });
            }

            const tempPath = path.join(__dirname, '../../../temp/downloads');
            await fs.ensureDir(tempPath);
            
            const filename = `${Date.now()}.mp3`;
            const filepath = path.join(tempPath, filename);

            const responseText = `🎵 *YouTube Audio Download*

📝 *Title:* ${title}
⏱️ *Duration:* ${Math.floor(duration / 60)}:${duration % 60}
📦 *Quality:* 128kbps
🔄 *Status:* Processing...

⚠️ Note: Download feature requires additional setup`;

            await sock.sendMessage(message.key.remoteJid, { text: responseText });

        } catch (error) {
            console.error('YouTube download error:', error);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Download failed. The video might be private, geo-restricted, or the service is temporarily unavailable.'
            });
        }
    }
};