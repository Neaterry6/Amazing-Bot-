import yts from 'yt-search';
import fs from 'fs-extra';
import path from 'path';

// Try dynamic import of distube ytdl-core

function findDownloadUrl(value, format = 'audio') {
  if (!value) return '';
  if (typeof value === 'string') {
    return /^https?:\/\//i.test(value) ? value : '';
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findDownloadUrl(item, format);
      if (found) return found;
    }
    return '';
  }
  if (typeof value !== 'object') return '';

  const preferredKeys = format === 'video'
    ? ['video', 'videoUrl', 'video_url', 'mp4', 'download', 'downloadUrl', 'url', 'link']
    : ['audio', 'audioUrl', 'audio_url', 'mp3', 'download', 'downloadUrl', 'url', 'link'];

  for (const key of preferredKeys) {
    const found = findDownloadUrl(value[key], format);
    if (found) return found;
  }

  for (const item of Object.values(value)) {
    const found = findDownloadUrl(item, format);
    if (found) return found;
  }
  return '';
}

async function fetchFromPlaybackApis(axios, query, format) {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Asta-Bot)' };
  const providers = [
    {
      name: 'DrexApp',
      url: `https://api.drexapp.space/downloader/ytplayv2?q=${encodeURIComponent(query)}`
    },
    {
      name: 'DavidCyril',
      url: `https://apis.davidcyril.name.ng/play?query=${encodeURIComponent(query)}&format=${format}`
    }
  ];

  let lastError = null;
  for (const provider of providers) {
    try {
      const apiRes = await axios.get(provider.url, { timeout: 90000, headers });
      const dlUrl = findDownloadUrl(apiRes.data, format);
      if (!dlUrl) throw new Error(`${provider.name} did not return a download URL`);
      const mediaRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 180000, headers });
      return { buffer: Buffer.from(mediaRes.data), provider: provider.name };
    } catch (error) {
      lastError = error;
      console.error(`${provider.name} play API failed:`, error.message);
    }
  }
  throw lastError || new Error('All play APIs failed');
}

async function getYtdl() {
  try {
    return await import('@distube/ytdl-core');
  } catch {
    try {
      return await import('ytdl-core');
    } catch {
      return null;
    }
  }
}

export default {
  name: 'play',
  aliases: ['ytmp3', 'song', 'ytvideo', 'ytmp4'],
  category: 'media',
  description: 'Search YouTube and send audio or video',
  usage: 'play <song name> or play --video <name>',
  cooldown: 5,

  async execute({ sock, message, args, from }) {
    if (!args.length) {
      return sock.sendMessage(from, {
        text: `🎵 *Play*\n\nUsage:\nplay <song name> — send audio\nplay --video <name> — send video\nplay --audio <name> — force audio\n\nReply to someone with play <name> to send it to them.`
      }, { quoted: message });
    }

    // Detect mode
    let format = 'audio';
    let query = args.join(' ').trim();
    const first = args[0]?.toLowerCase();
    if (first === '--video' || first === '-v') {
      format = 'video';
      query = args.slice(1).join(' ').trim();
    } else if (first === '--audio' || first === '-a') {
      format = 'audio';
      query = args.slice(1).join(' ').trim();
    }

    if (!query) {
      return sock.sendMessage(from, { text: '❌ Give a song name or video title.' }, { quoted: message });
    }

    // Check if user replied to someone — send to that person instead
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    let targetJid = from;
    if (ctx?.participant && from.endsWith('@g.us')) {
      targetJid = ctx.participant;
    }

    try {
      await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });

      // Search
      const search = await yts(query);
      if (!search?.videos?.length) {
        await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        return sock.sendMessage(from, { text: `❌ No results for "${query}".` }, { quoted: message });
      }

      const video = search.videos[0];
      const title = video.title || 'Unknown';
      const duration = video.timestamp || 'N/A';
      const views = video.views?.toLocaleString() || 'N/A';
      const thumbnail = video.thumbnail || '';
      const videoUrl = video.url;

      await sock.sendMessage(from, {
        text: `📥 Found: *${title}*\n⏱️ ${duration} • 👁️ ${views}\n⬇️ Downloading ${format}...`
      }, { quoted: message });

      // Try ytdl-core first
      const ytdl = await getYtdl();
      if (ytdl && ytdl.default?.validateURL) {
        try {
          const yt = ytdl.default || ytdl;
          await yt.getInfo(videoUrl);
          const tempDir = path.join(process.cwd(), 'temp', 'downloads');
          await fs.ensureDir(tempDir);

          if (format === 'audio') {
            const stream = yt(videoUrl, {
              filter: 'audioonly',
              quality: 'highestaudio'
            });
            const audioPath = path.join(tempDir, `play_${Date.now()}.mp3`);
            const writeStream = fs.createWriteStream(audioPath);
            stream.pipe(writeStream);
            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
              stream.on('error', reject);
            });
            const audioBuffer = await fs.readFile(audioPath);
            await fs.remove(audioPath).catch(() => {});

            await sock.sendMessage(from, { react: { text: '🎧', key: message.key } });
            await sock.sendMessage(targetJid, {
              audio: audioBuffer,
              mimetype: 'audio/mpeg',
              fileName: `${title.replace(/[\\/:*?"<>|]/g, '').slice(0, 120)}.mp3`,
              contextInfo: {
                externalAdReply: {
                  thumbnailUrl: thumbnail,
                  title: title.slice(0, 100),
                  body: `👁️ ${views} views • ⏱️ ${duration}`,
                  sourceUrl: videoUrl,
                  renderLargerThumbnail: true,
                  mediaType: 1
                }
              }
            }, targetJid === from ? { quoted: message } : undefined);

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
            if (targetJid !== from) {
              await sock.sendMessage(from, { text: `✅ Sent "${title}" to the replied user.` }, { quoted: message });
            }
            return;
          } else {
            // Video
            const stream = yt(videoUrl, {
              filter: f => f.container === 'mp4' && f.hasVideo && f.hasAudio,
              quality: 'lowest' // smallest file for WhatsApp
            });
            const videoPath = path.join(tempDir, `play_vid_${Date.now()}.mp4`);
            const writeStream = fs.createWriteStream(videoPath);
            stream.pipe(writeStream);
            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
              stream.on('error', reject);
            });
            const videoBuffer = await fs.readFile(videoPath);
            await fs.remove(videoPath).catch(() => {});

            await sock.sendMessage(from, { react: { text: '🎬', key: message.key } });
            await sock.sendMessage(targetJid, {
              video: videoBuffer,
              mimetype: 'video/mp4',
              caption: `${title}\n👁️ ${views} • ⏱️ ${duration}\n${videoUrl}`,
              contextInfo: {
                externalAdReply: {
                  thumbnailUrl: thumbnail,
                  title: title.slice(0, 100),
                  body: `👁️ ${views} views • ⏱️ ${duration}`,
                  sourceUrl: videoUrl,
                  renderLargerThumbnail: true,
                  mediaType: 1
                }
              }
            }, targetJid === from ? { quoted: message } : undefined);

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
            if (targetJid !== from) {
              await sock.sendMessage(from, { text: `✅ Sent "${title}" to the replied user.` }, { quoted: message });
            }
            return;
          }
        } catch (ytdlErr) {
          console.error('ytdl-core failed, falling back to API:', ytdlErr.message);
        }
      }

      // Fallback: use current query-based APIs (DrexApp first, DavidCyril second)
      await sock.sendMessage(from, { text: '🔄 Using fallback API...' }, { quoted: message });
      const axios = (await import('axios')).default;
      const { buffer: mediaBuffer, provider } = await fetchFromPlaybackApis(axios, query, format);

      await sock.sendMessage(from, { react: { text: '🎧', key: message.key } });

      const msgOpts = format === 'video'
        ? { video: mediaBuffer, mimetype: 'video/mp4', caption: `${title}\n${videoUrl}\n\nSource: ${provider}` }
        : {
            audio: mediaBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${title.replace(/[\\/:*?"<>|]/g, '').slice(0, 120)}.mp3`,
            contextInfo: {
              externalAdReply: {
                thumbnailUrl: thumbnail,
                title: title.slice(0, 100),
                body: `👁️ ${views} views • ⏱️ ${duration}`,
                sourceUrl: videoUrl,
                renderLargerThumbnail: true,
                mediaType: 1
              }
            }
          };

      await sock.sendMessage(targetJid, msgOpts, targetJid === from ? { quoted: message } : undefined);
      await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
      if (targetJid !== from) {
        await sock.sendMessage(from, { text: `✅ Sent "${title}" to the replied user.` }, { quoted: message });
      }

    } catch (error) {
      console.error('Play Error:', error.message);
      await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
      return sock.sendMessage(from, {
        text: `❌ Play failed: ${error.message}\n\nTry again or a different song.`
      }, { quoted: message });
    }
  }
};
