import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yts from 'yt-search';

const YOUTUBE_URL_RE = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i;

function senderJid(message) {
  return message?.key?.participant || message?.key?.remoteJid || '';
}
function bareJid(jid = '') {
  return String(jid).split(':')[0];
}

async function downloadAndSend(url, type, sock, chatId, quotedMessage) {
  let tmpFilePath = '';
  try {
    await sock.sendMessage(chatId, {
      text: `📥 Initializing ${type} download...\nPlease wait.`
    }, { quoted: quotedMessage });

    const format = type === 'audio' ? 'mp3' : '480';
    const apiUrl = `https://p.savenow.to/ajax/download.php?copyright=0&format=${format}&url=${encodeURIComponent(url)}&api=dfaxaxcb6d76f2f6a9894gjkege8a4ab232222`;

    const response = await axios.get(apiUrl, { timeout: 30000 });
    const resData = response.data || {};

    if (!resData.success || !resData.progress_url) {
      throw new Error('API failed to provide a progress URL.');
    }

    const title = resData.info?.title || resData.title || 'download';
    let downloadUrl = null;

    for (let i = 0; i < 15; i++) {
      const progressRes = await axios.get(resData.progress_url, { timeout: 20000 });
      const progressData = progressRes.data || {};

      if (progressData.download_url) {
        downloadUrl = progressData.download_url;
        break;
      }
      if (progressData.url) {
        downloadUrl = progressData.url;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!downloadUrl) {
      throw new Error('Timed out waiting for the download link to generate.');
    }

    const ext = type === 'audio' ? 'mp3' : 'mp4';
    const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').slice(0, 40) || `youtube_${Date.now()}`;
    tmpFilePath = path.join(os.tmpdir(), `${Date.now()}.${ext}`);

    const writer = fs.createWriteStream(tmpFilePath);
    const stream = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream', timeout: 120000 });
    stream.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    if (type === 'audio') {
      await sock.sendMessage(chatId, {
        audio: { url: tmpFilePath },
        mimetype: 'audio/mpeg',
        fileName: `${safeTitle}.mp3`,
        ptt: false
      }, { quoted: quotedMessage });
      return;
    }

    await sock.sendMessage(chatId, {
      video: { url: tmpFilePath },
      mimetype: 'video/mp4',
      fileName: `${safeTitle}.mp4`,
      caption: `📺 _${title}_`
    }, { quoted: quotedMessage });
  } finally {
    if (tmpFilePath && fs.existsSync(tmpFilePath)) fs.unlink(tmpFilePath, () => {});
  }
}

export default {
  name: 'ytb',
  aliases: ['youtube', 'y', 'yt'],
  category: 'downloader',
  description: 'Download YouTube audio/video by search or URL',
  usage: 'ytb -a|-v <query or url>',
  cooldown: 10,
  permissions: ['user'],

  async execute({ sock, message, args, from, sender }) {
    if (!args.length) {
      return sock.sendMessage(from, {
        text: 'Please specify type and query.\nUsage:\nytb -a <song name/url>\nytb -v <video name/url>'
      }, { quoted: message });
    }

    let type = 'video';
    if (['audio', '-a'].includes(args[0].toLowerCase())) {
      type = 'audio';
      args.shift();
    } else if (['video', '-v'].includes(args[0].toLowerCase())) {
      type = 'video';
      args.shift();
    } else if (!String(args[0] || '').startsWith('http')) {
      return sock.sendMessage(from, {
        text: '⚠️ Please use -a for audio or -v for video first.'
      }, { quoted: message });
    }

    const query = args.join(' ').trim();
    if (!query) {
      return sock.sendMessage(from, { text: 'Please provide a URL or search term.' }, { quoted: message });
    }

    if (YOUTUBE_URL_RE.test(query)) {
      try {
        await downloadAndSend(query, type, sock, from, message);
      } catch (error) {
        await sock.sendMessage(from, { text: `❌ Error: ${error.message}` }, { quoted: message });
      }
      return;
    }

    try {
      await sock.sendMessage(from, { text: `🔍 Searching YouTube for: *${query}*...` }, { quoted: message });
      const search = await yts(query);
      const videos = (search?.videos || []).slice(0, 5);

      if (!videos.length) {
        return sock.sendMessage(from, { text: `No results found for "${query}".` }, { quoted: message });
      }

      let listMsg = `🎵 *YouTube ${type === 'audio' ? 'Audio' : 'Video'} Results*\n\n`;
      videos.forEach((v, i) => {
        listMsg += `*${i + 1}.* ${v.title}\n`;
        listMsg += `   ⏱️ ${v.timestamp} | 📺 ${v.author?.name || 'Unknown'}\n`;
      });
      listMsg += '\n_Reply with 1-5 to download._';

      const sentMsg = await sock.sendMessage(from, { text: listMsg }, { quoted: message });

      if (!global.replyHandlers) global.replyHandlers = {};
      global.replyHandlers[sentMsg.key.id] = {
        command: 'ytb',
        handler: async (replyText, replyMessage) => {
          const replySender = bareJid(senderJid(replyMessage));
          if (replySender !== bareJid(sender)) return;

          const choice = parseInt(String(replyText || '').trim(), 10);
          if (Number.isNaN(choice) || choice < 1 || choice > videos.length) {
            return sock.sendMessage(from, { text: '❌ Invalid choice.' }, { quoted: replyMessage });
          }

          const selected = videos[choice - 1];
          try {
            await downloadAndSend(selected.url, type, sock, from, replyMessage);
          } catch (error) {
            await sock.sendMessage(from, { text: `❌ Error: ${error.message}` }, { quoted: replyMessage });
          } finally {
            delete global.replyHandlers?.[sentMsg.key.id];
          }
        }
      };
    } catch {
      await sock.sendMessage(from, { text: '❌ Search failed.' }, { quoted: message });
    }
  }
};
