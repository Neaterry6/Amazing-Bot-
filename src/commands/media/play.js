import axios from 'axios';
import yts from 'yt-search';
import fs from 'fs-extra';
import path from 'path';

function findDownloadUrl(value, format = 'audio') {
  if (!value) return '';
  if (typeof value === 'string') return /^https?:\/\//i.test(value) ? value : '';
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findDownloadUrl(item, format);
      if (found) return found;
    }
    return '';
  }
  if (typeof value !== 'object') return '';

  const preferredKeys = format === 'video'
    ? ['video', 'videoUrl', 'video_url', 'mp4', 'download', 'downloadURL', 'downloadUrl', 'download_url', 'url', 'link']
    : ['audio', 'audioUrl', 'audio_url', 'mp3', 'download', 'downloadURL', 'downloadUrl', 'download_url', 'url', 'link'];

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

async function fetchFastApiUrl(query, format = 'audio') {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Asta-Bot)' };
  const endpoints = [
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
  for (const endpoint of endpoints) {
    try {
      const { data } = await axios.get(endpoint.url, { timeout: 45000, headers });
      const downloadUrl = findDownloadUrl(data, format);
      if (!downloadUrl) throw new Error(`${endpoint.name} did not return a download URL`);
      return {
        downloadUrl,
        provider: endpoint.name,
        title: data?.result?.title || data?.title || data?.data?.title || ''
      };
    } catch (error) {
      lastError = error;
      console.error(`${endpoint.name} play API failed:`, error.message);
    }
  }
  throw lastError || new Error('All play APIs failed');
}

function safeTitle(title = 'audio') {
  return String(title).replace(/[\\/:*?"<>|]/g, '').slice(0, 120) || 'audio';
}

function getReplyTarget(message, from) {
  const ctx = message.message?.extendedTextMessage?.contextInfo;
  if (ctx?.participant && from.endsWith('@g.us')) return ctx.participant;
  return from;
}

async function searchVideo(query) {
  try {
    const search = await yts(query);
    return search?.videos?.[0] || null;
  } catch {
    return null;
  }
}

async function sendApiMedia({ sock, message, from, targetJid, query, format, metadata }) {
  const api = await fetchFastApiUrl(query, format);
  const title = metadata?.title || api.title || query;
  const videoUrl = metadata?.url || '';
  const thumbnail = metadata?.thumbnail || '';
  const duration = metadata?.timestamp || 'N/A';
  const views = metadata?.views?.toLocaleString?.() || 'N/A';

  if (format === 'video') {
    const mediaRes = await axios.get(api.downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 180000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Asta-Bot)' }
    });
    await sock.sendMessage(targetJid, {
      video: Buffer.from(mediaRes.data),
      mimetype: 'video/mp4',
      caption: `${title}${videoUrl ? `\n${videoUrl}` : ''}\n\nSource: ${api.provider}`
    }, targetJid === from ? { quoted: message } : undefined);
    return title;
  }

  await sock.sendMessage(targetJid, {
    audio: { url: api.downloadUrl },
    mimetype: 'audio/mpeg',
    fileName: `${safeTitle(title)}.mp3`,
    contextInfo: {
      externalAdReply: {
        thumbnailUrl: thumbnail,
        title: title.slice(0, 100),
        body: `${api.provider}${views !== 'N/A' ? ` • 👁️ ${views}` : ''}${duration !== 'N/A' ? ` • ⏱️ ${duration}` : ''}`,
        sourceUrl: videoUrl || api.downloadUrl,
        renderLargerThumbnail: true,
        mediaType: 1
      }
    }
  }, targetJid === from ? { quoted: message } : undefined);
  return title;
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
        text: `🎵 *Play*\n\nUsage:\nplay <song name> — send audio\nplay --video <name> — send video\nplay --audio <name> — force audio\nReply to someone with play <name> to send it to them.`
      }, { quoted: message });
    }

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

    const targetJid = getReplyTarget(message, from);

    try {
      await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });

      const metadataPromise = searchVideo(query);

      if (format === 'audio') {
        await sock.sendMessage(from, { text: '🎵 Searching song...\n⬇️ Downloading audio...' }, { quoted: message });
        try {
          const metadata = await Promise.race([
            metadataPromise,
            new Promise((resolve) => setTimeout(() => resolve(null), 2500))
          ]);
          const title = await sendApiMedia({ sock, message, from, targetJid, query, format, metadata });
          await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
          if (targetJid !== from) {
            await sock.sendMessage(from, { text: `✅ Sent "${title}" to the replied user.` }, { quoted: message });
          }
          return;
        } catch (apiError) {
          console.error('Fast play API failed, falling back to ytdl-core:', apiError.message);
        }
      }

      const video = await metadataPromise;
      if (!video) {
        await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        return sock.sendMessage(from, { text: `❌ No results for "${query}".` }, { quoted: message });
      }

      const title = video.title || 'Unknown';
      const duration = video.timestamp || 'N/A';
      const views = video.views?.toLocaleString() || 'N/A';
      const thumbnail = video.thumbnail || '';
      const videoUrl = video.url;

      await sock.sendMessage(from, {
        text: `📥 Found: *${title}*\n⏱️ ${duration} • 👁️ ${views}\n⬇️ Downloading ${format}...`
      }, { quoted: message });

      const ytdl = await getYtdl();
      if (ytdl && ytdl.default?.validateURL) {
        try {
          const yt = ytdl.default || ytdl;
          const tempDir = path.join(process.cwd(), 'temp', 'downloads');
          await fs.ensureDir(tempDir);

          if (format === 'audio') {
            const stream = yt(videoUrl, { filter: 'audioonly', quality: 'lowestaudio' });
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

            await sock.sendMessage(targetJid, {
              audio: audioBuffer,
              mimetype: 'audio/mpeg',
              fileName: `${safeTitle(title)}.mp3`,
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
          } else {
            const stream = yt(videoUrl, {
              filter: f => f.container === 'mp4' && f.hasVideo && f.hasAudio,
              quality: 'lowest'
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

            await sock.sendMessage(targetJid, {
              video: videoBuffer,
              mimetype: 'video/mp4',
              caption: `${title}\n👁️ ${views} • ⏱️ ${duration}\n${videoUrl}`
            }, targetJid === from ? { quoted: message } : undefined);
          }

          await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
          if (targetJid !== from) {
            await sock.sendMessage(from, { text: `✅ Sent "${title}" to the replied user.` }, { quoted: message });
          }
          return;
        } catch (ytdlErr) {
          console.error('ytdl-core failed, falling back to API:', ytdlErr.message);
        }
      }

      await sock.sendMessage(from, { text: '🔄 Using fallback API...' }, { quoted: message });
      const sentTitle = await sendApiMedia({ sock, message, from, targetJid, query, format, metadata: video });
      await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
      if (targetJid !== from) {
        await sock.sendMessage(from, { text: `✅ Sent "${sentTitle}" to the replied user.` }, { quoted: message });
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
