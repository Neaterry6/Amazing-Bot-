import yts from 'yt-search';
import axios from 'axios';
import ytdl from 'ytdl-core';
import fs from 'fs-extra';
import path from 'path';
import logger from '../../utils/logger.js';

export default {
  name: 'play',
  aliases: ['p', 'music', 'yt'],
  category: 'downloader',
  description: 'Download and play audio from YouTube by searching song name with album artwork',
  usage: 'play <song name>',
  example: 'play baby girl by joeboy\nplay lucid dreams',
  cooldown: 10,
  permissions: ['user'],
  args: true,
  minArgs: 1,
  maxArgs: 50,
  typing: true,
  premium: false,
  hidden: false,
  ownerOnly: false,
  supportsReply: false,
  supportsChat: false,
  supportsReact: true,
  supportsButtons: false,

  async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
    try {
      const searchQuery = args.join(' ').trim();

      if (!searchQuery) {
        await sock.sendMessage(from, {
          text: '❌ *Oops!*\nPlease provide a song name.\n\n📜 *Usage*: `play <song name>`\n🎶 *Example*: `play baby girl by joeboy`',
        }, { quoted: message });
        return;
      }

      // React with magnifying glass emoji (🔍) to indicate searching
      await sock.sendMessage(from, {
        react: { text: '🔍', key: message.key },
      });

      // Send search message and store its ID
      const searchMessage = await sock.sendMessage(from, {
        text: `🎵 *Searching*: ${searchQuery}...`,
      }, { quoted: message });

      // Search using new API
      let videoData;
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          const response = await axios.get(
            `https://ytplay-api-0il6.onrender.com/play?query=${encodeURIComponent(searchQuery)}`,
            { timeout: 15000 }
          );

          if (response.data && response.data.status && response.data.url) {
            videoData = response.data;
            break;
          } else {
            throw new Error('Invalid response from ytplay API');
          }
        } catch (error) {
          attempt++;
          logger.error(`ytplay API attempt ${attempt}/${maxRetries} failed:`, error);
          if (attempt === maxRetries) {
            await sock.sendMessage(from, { delete: searchMessage.key });
            await sock.sendMessage(from, {
              text: `❌ *Error*\nFailed to search: API unavailable.\n\n💡 Try again later!`,
            }, { quoted: message });
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
        }
      }

      const { url: urlYt, title, thumbnail, duration, creator: author, views } = videoData;

      // Fallback to yt-search if API fails to provide enough data
      let fallbackVideo;
      if (!urlYt || !title) {
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
          await sock.sendMessage(from, { delete: searchMessage.key });
          await sock.sendMessage(from, {
            text: `❌ *Not Found*\nNo results for: *${searchQuery}*\n\n🔍 Try different keywords!`,
          }, { quoted: message });
          return;
        }
        fallbackVideo = videos[0];
      }

      const finalUrl = urlYt || fallbackVideo.url;
      const finalTitle = title || fallbackVideo.title;
      const finalThumbnail = thumbnail || fallbackVideo.thumbnail;
      const finalDuration = duration || fallbackVideo.timestamp;
      const finalAuthor = author || fallbackVideo.author.name;
      const finalViews = views || fallbackVideo.views;

      // Download audio using ytdl-core
      let audioPath;
      try {
        const tempDir = path.join(process.cwd(), 'temp', 'audio');
        await fs.ensureDir(tempDir);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
        audioPath = path.join(tempDir, fileName);

        const stream = ytdl(finalUrl, {
          filter: 'audioonly',
          quality: 'highestaudio',
        });

        await new Promise((resolve, reject) => {
          stream
            .pipe(fs.createWriteStream(audioPath))
            .on('finish', resolve)
            .on('error', reject);
        });

        // Check file size (WhatsApp limit ~100MB)
        const stats = await fs.stat(audioPath);
        if (stats.size > 100 * 1024 * 1024) {
          throw new Error('Audio file too large for WhatsApp');
        }

        // Delete search message
        await sock.sendMessage(from, { delete: searchMessage.key });

        // Send audio with details in caption
        await sock.sendMessage(from, {
          audio: { url: audioPath },
          mimetype: 'audio/mpeg',
          fileName: `${finalTitle}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: finalTitle,
              body: `🎵 ${finalAuthor} | ⏱ ${finalDuration}`,
              thumbnailUrl: finalThumbnail,
              mediaType: 2,
              mediaUrl: finalUrl,
              sourceUrl: finalUrl,
            },
          },
          caption: `✅ *Song Downloaded*\n📝 *Title*: ${finalTitle}\n👤 *Artist*: ${finalAuthor}\n⏱ *Duration*: ${finalDuration}\n📦 *Format*: MP3`,
        }, { quoted: message });

        // Clean up temporary file
        await fs.remove(audioPath);
      } catch (error) {
        logger.error('Failed to download audio:', error);
        await sock.sendMessage(from, { delete: searchMessage.key });
        await sock.sendMessage(from, {
          text: `❌ *Error*\nFailed to download audio: ${error.message}\n\n💡 Try again later!`,
        }, { quoted: message });
        if (audioPath && (await fs.pathExists(audioPath))) {
          await fs.remove(audioPath);
        }
      }
    } catch (error) {
      logger.error('Error in play command:', error);
      await sock.sendMessage(from, {
        text: `❌ *Error*\nFailed to process: ${error.message}\n\n💡 Try again later!`,
      }, { quoted: message });
    }
  },
};