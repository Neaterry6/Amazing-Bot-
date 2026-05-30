import axios from 'axios';

const SUNO_WRAPPER_BASE = (process.env.SUNO_WRAPPER_BASE || 'https://api.sunoapi.org').replace(/\/$/, '');
const SUNO_ACCESS_TOKEN = process.env.SUNO_ACCESS_TOKEN || '';
const DEFAULT_MODEL = process.env.SUNO_MODEL || 'V4_5ALL';
const POLL_INTERVAL_MS = Number(process.env.SUNO_POLL_INTERVAL_MS || 7000);
const MAX_POLLS = Number(process.env.SUNO_MAX_POLLS || 35); // ~4 minutes at the default interval
const SOURCE_URL = 'https://whatsapp.com/channel/0029Vb785rSBlHpWSitPY61i';

const FAILURE_STATUSES = new Set([
    'failed',
    'error',
    'cancelled',
    'create_task_failed',
    'generate_audio_failed',
    'callback_exception',
    'sensitive_word_error'
]);

function parsePrompt(text = '') {
    const input = String(text || '').trim();
    const byMatch = input.match(/\bby\s+(.+)$/i);
    const artist = byMatch ? byMatch[1].trim() : '';
    const core = byMatch ? input.slice(0, byMatch.index).trim() : input;

    const styleKeywords = [
        'afrobeat', 'drill', 'hip hop', 'rap', 'trap', 'pop', 'rock', 'rnb', 'r&b', 'jazz',
        'blues', 'reggae', 'dancehall', 'country', 'edm', 'house', 'techno', 'amapiano',
        'gospel', 'soul', 'funk', 'lofi', 'lo-fi', 'classical', 'metal', 'punk', 'indie',
        'folk', 'kpop', 'afropop', 'highlife', 'soca', 'dubstep', 'grime'
    ];

    let style = '';
    let prompt = core;
    const lc = core.toLowerCase();
    for (const keyword of styleKeywords) {
        const idx = lc.indexOf(keyword);
        if (idx !== -1) {
            style = keyword;
            prompt = `${core.slice(0, idx)} ${core.slice(idx + keyword.length)}`.replace(/\s+/g, ' ').trim();
            break;
        }
    }

    if (!prompt) prompt = 'a creative song';
    if (artist) prompt = `${prompt}. Make it inspired by ${artist}.`;

    return {
        prompt,
        style,
        title: prompt.replace(/\s+/g, ' ').slice(0, 60),
        artist
    };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStatus(status = '') {
    return String(status || '').trim().toLowerCase();
}

function getApiError(payload, fallback = 'Suno API request failed') {
    const raw = payload?.data || payload?.result || payload || {};
    return raw?.errorMessage || raw?.error || raw?.message || payload?.msg || payload?.message || fallback;
}

function pickTaskId(payload) {
    const candidates = [
        payload?.data?.taskId,
        payload?.data?.task_id,
        payload?.data?.id,
        payload?.result?.taskId,
        payload?.result?.task_id,
        payload?.result?.id,
        payload?.taskId,
        payload?.task_id,
        payload?.id
    ];

    return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}

function firstArrayItem(...values) {
    for (const value of values) {
        if (Array.isArray(value) && value.length) return value[0] || {};
    }
    return {};
}

function pickSong(payload) {
    const raw = payload?.data || payload?.result || payload || {};
    const response = raw?.response || raw?.result || raw;
    const first = firstArrayItem(
        response?.sunoData,
        response?.data,
        response?.songs,
        response?.clips,
        raw?.sunoData,
        raw?.songs,
        raw?.clips
    );

    return Object.keys(first).length ? first : response;
}

function pickAudioUrl(payload) {
    const song = pickSong(payload);
    return song?.audioUrl || song?.audio_url || song?.streamAudioUrl || song?.stream_audio_url || song?.streamUrl || song?.url || '';
}

function durationText(seconds = 0) {
    const total = Math.max(0, Number(seconds) || 0);
    const min = Math.floor(total / 60);
    const sec = String(Math.floor(total % 60)).padStart(2, '0');
    return `${min}:${sec}`;
}

function safeFileName(name = 'suno_track') {
    return String(name || 'suno_track').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 120) || 'suno_track';
}

async function startGeneration({ prompt, style, title }) {
    const body = {
        customMode: Boolean(style),
        instrumental: false,
        model: DEFAULT_MODEL,
        prompt,
        style: style || undefined,
        title: title || undefined
    };

    const { data } = await axios.post(`${SUNO_WRAPPER_BASE}/api/v1/generate`, body, {
        timeout: 45000,
        headers: {
            Authorization: `Bearer ${SUNO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Asta-Bot/1.0'
        }
    });

    if (data?.code && Number(data.code) !== 200) {
        throw new Error(getApiError(data, `Suno API returned code ${data.code}`));
    }

    const taskId = pickTaskId(data);
    if (!taskId) {
        const preview = JSON.stringify(data).slice(0, 300);
        throw new Error(`Suno wrapper did not return a task ID. Response: ${preview}`);
    }

    return taskId;
}

async function waitForSong(taskId) {
    let lastStatus = 'pending';
    let lastPayload = null;

    for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(POLL_INTERVAL_MS);

        const { data } = await axios.get(`${SUNO_WRAPPER_BASE}/api/v1/generate/record-info`, {
            params: { taskId },
            timeout: 45000,
            headers: {
                Authorization: `Bearer ${SUNO_ACCESS_TOKEN}`,
                'User-Agent': 'Asta-Bot/1.0'
            }
        });

        lastPayload = data;
        const raw = data?.data || data?.result || data || {};
        const status = normalizeStatus(raw?.status || raw?.state || raw?.successFlag || raw?.success_flag);
        if (status) lastStatus = status;

        const audioUrl = pickAudioUrl(data);
        if (audioUrl) {
            const song = pickSong(data);
            return { audioUrl, song, meta: raw };
        }

        if (FAILURE_STATUSES.has(status)) {
            throw new Error(getApiError(raw, 'generation failed'));
        }
    }

    const preview = lastPayload ? ` Response: ${JSON.stringify(lastPayload).slice(0, 250)}` : '';
    throw new Error(`Generation timeout (last status: ${lastStatus}).${preview}`);
}

export default {
    name: 'suno',
    aliases: ['music', 'song', 'songgen', 'musicgen', 'musica', 'suno2'],
    category: 'ai',
    description: 'Generate AI music via SunoAPI wrapper',
    usage: 'suno <description> <genre> by <artist>',
    example: 'suno I love you afrobeat by Kenzy',
    cooldown: 60,
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args, prefix = '.', commandName }) {
        if (!SUNO_ACCESS_TOKEN) {
            return await sock.sendMessage(from, {
                text: '❌ SUNO_ACCESS_TOKEN is missing in env.'
            }, { quoted: message });
        }

        const text = args.join(' ').trim();
        if (!text) {
            return await sock.sendMessage(from, {
                text: `🎵 *Suno Music Generator*\n\nUsage:\n${prefix}${commandName || 'suno'} <description> <genre> by <artist>\n\nExample:\n${prefix}${commandName || 'suno'} calm piano classical by Mozart`
            }, { quoted: message });
        }

        const parsed = parsePrompt(text);
        await sock.sendMessage(from, { react: { text: '🎵', key: message.key } });

        const progress = await sock.sendMessage(from, {
            text: [
                '🎶 *Suno Generation Started*',
                `📝 Prompt: ${parsed.prompt}`,
                `🎼 Style: ${parsed.style || 'auto'}`,
                `👤 Artist: ${parsed.artist || 'auto'}`,
                `🤖 Model: ${DEFAULT_MODEL}`,
                '',
                '⏳ Please wait 1-4 minutes...'
            ].join('\n')
        }, { quoted: message });

        try {
            const taskId = await startGeneration(parsed);
            const { audioUrl, song } = await waitForSong(taskId);
            const title = song?.title || parsed.title || 'Suno Track';
            const imageUrl = song?.imageUrl || song?.image_url;
            const tags = song?.tags || parsed.style || 'AI Music';
            const duration = song?.duration;

            await sock.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: `${safeFileName(title)}.mp3`,
                caption: `🎵 *${title}*\n🆔 Task: ${taskId}`,
                contextInfo: {
                    externalAdReply: {
                        title: `▶️ ${title}`,
                        body: `🎼 ${tags}${duration ? ` • ⏱️ ${durationText(duration)}` : ''}`,
                        thumbnailUrl: imageUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl: SOURCE_URL
                    }
                }
            }, { quoted: message });

            try { await sock.sendMessage(from, { delete: progress.key }); } catch {}
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            try { await sock.sendMessage(from, { delete: progress.key }); } catch {}
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            await sock.sendMessage(from, {
                text: `❌ Suno generation failed: ${error.message || error}`
            }, { quoted: message });
        }
    }
};
