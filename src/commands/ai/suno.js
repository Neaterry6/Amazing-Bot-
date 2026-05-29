import axios from 'axios';

const SUNO_API = 'https://omegatech-api.dixonomega.tech/api/ai/sonu3';
const SOURCE_URL = 'https://whatsapp.com/channel/0029Vb785rSBlHpWSitPY61i';

async function generateSuno(prompt) {
    if (!prompt) throw new Error('Prompt is required');
    const { data } = await axios.get(SUNO_API, {
        params: { action: 'full', prompt },
        timeout: 180000,
        headers: { 'User-Agent': 'Asta-Bot/1.0' }
    });

    if (!data?.success || !data?.url) throw new Error(data?.message || data?.error || 'No music generated');
    return {
        title: data.title || 'Suno Track',
        audioUrl: data.url,
        imageUrl: data.thumbnail,
        lyrics: data.lyrics,
        tags: data.tags,
        duration: Number(data.duration) || 0
    };
}

function durationText(seconds = 0) {
    const total = Math.max(0, Number(seconds) || 0);
    const min = Math.floor(total / 60);
    const sec = String(Math.floor(total % 60)).padStart(2, '0');
    return `${min}:${sec}`;
}

export default {
    name: 'suno',
    aliases: ['music', 'song', 'songgen', 'musicgen', 'musica'],
    category: 'ai',
    description: 'Generate AI music with OmegaTech sonu3 API',
    usage: 'suno <prompt>',
    example: 'suno Sad song about lost love',
    cooldown: 60,
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args, prefix, commandName }) {
        const prompt = args.join(' ').trim();
        if (!prompt) {
            return await sock.sendMessage(from, {
                text: `🎵 *Usage:*\n${prefix}${commandName || 'suno'} <prompt>\n\n*Example:*\n${prefix}${commandName || 'suno'} Sad song about lost love`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🎵', key: message.key } });
            await sock.sendMessage(from, { text: '⏳ Generating your song, please wait...' }, { quoted: message });

            const track = await generateSuno(prompt);
            const [audioRes, imgRes] = await Promise.all([
                axios.get(track.audioUrl, {
                    responseType: 'arraybuffer',
                    timeout: 180000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                }),
                track.imageUrl
                    ? axios.get(track.imageUrl, { responseType: 'arraybuffer', timeout: 60000 }).catch(() => null)
                    : null
            ]);

            const audioBuffer = Buffer.from(audioRes.data);
            const imgBuffer = imgRes?.data ? Buffer.from(imgRes.data) : undefined;
            const safeTitle = String(track.title || 'suno_track').replace(/[\\/:*?"<>|]/g, '').slice(0, 120);

            await sock.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: `${safeTitle}.mp3`,
                jpegThumbnail: imgBuffer,
                contextInfo: {
                    externalAdReply: {
                        title: `▶️ ${track.title}`,
                        body: `🎼 ${track.tags || 'AI Music'} • ⏱️ ${durationText(track.duration)}`,
                        thumbnailUrl: track.imageUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl: SOURCE_URL
                    }
                }
            }, { quoted: message });

            await sock.sendMessage(from, {
                text: `🎤 *Lyrics — ${track.title}*\n┄┄┄┄┄┄┄┄┄┄┄┄\n${String(track.lyrics || 'N/A').slice(0, 1500)}\n┄┄┄┄┄┄┄┄┄┄┄┄\n📡 *Powered by Omegatech*\n╭──────────────\n│ 🟢 WhatsApp: ${SOURCE_URL}\n│ ✈️ Telegram: https://t.me/+OrLFsvjjlVM2ZjRk\n╰──────────────`
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            return await sock.sendMessage(from, {
                text: `💥 *Suno Error:* ${error.message || error}`
            }, { quoted: message });
        }
    }
};
