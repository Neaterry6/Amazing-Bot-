import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const DATA_DIR = path.join(process.cwd(), 'data', 'ai');
const HISTORY_FILE = path.join(DATA_DIR, 'ai_history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'ai_settings.json');
const LOW_RESOURCE_MODE = process.env.LOW_RESOURCE_MODE === 'true';
const MAX_HISTORY = LOW_RESOURCE_MODE ? 8 : 20;
const REPLY_TTL = 10 * 60 * 1000;
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

const PERSONALITIES = {
    normal:    'You are a helpful, friendly AI assistant. Be concise and clear.',
    ilom:      'You are Ilom Bot, a confident and intelligent assistant. Be smooth, smart and direct. Keep replies sharp.',
    coder:     'You are an elite senior software engineer. Provide clean optimized code with no fluff unless asked.',
    assistant: 'You are a professional assistant. Structured, straight to the point, always helpful.',
    funny:     'You are a witty comedian AI. Keep it clever and funny but still helpful.',
    teacher:   'You are a patient teacher. Explain clearly with examples and break down complex topics simply.',
    savage:    'You are brutally honest with no sugarcoating but always accurate and helpful.'
};

const DEFAULT_SETTINGS = { personality: 'ilom', voiceMode: false };

function normJid(jid) {
    return String(jid || '').replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '').split(':')[0].replace(/[^0-9]/g, '');
}

async function ensureDir() {
    await fs.ensureDir(DATA_DIR);
}

async function loadSettings(uid) {
    await ensureDir();
    try {
        const all = await fs.readJSON(SETTINGS_FILE);
        return { ...DEFAULT_SETTINGS, ...(all[uid] || {}) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

async function saveSettings(uid, settings) {
    await ensureDir();
    let all = {};
    try { all = await fs.readJSON(SETTINGS_FILE); } catch {}
    all[uid] = settings;
    await fs.writeJSON(SETTINGS_FILE, all, { spaces: 2 });
}

async function loadHistory(uid) {
    await ensureDir();
    try {
        const all = await fs.readJSON(HISTORY_FILE);
        return all[uid] || [];
    } catch {
        return [];
    }
}

async function saveHistory(uid, history) {
    await ensureDir();
    let all = {};
    try { all = await fs.readJSON(HISTORY_FILE); } catch {}
    all[uid] = history.slice(-MAX_HISTORY);
    await fs.writeJSON(HISTORY_FILE, all, { spaces: 2 });
}

function stripTrailingDetailsBlock(text) {
    const trimmedEnd = String(text || '').replace(/\s+$/g, '');
    const closeTag = '</details>';
    const lower = trimmedEnd.toLowerCase();
    const closeIndex = lower.lastIndexOf(closeTag);

    if (closeIndex < 0 || closeIndex + closeTag.length !== trimmedEnd.length) return String(text || '');

    const openIndex = lower.lastIndexOf('<details', closeIndex);
    if (openIndex < 0) return String(text || '');

    return trimmedEnd.slice(0, openIndex).trimEnd();
}

async function askOmegaAI(personality, history) {
    if (!GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY in environment');

    const systemPrompt = PERSONALITIES[personality] || PERSONALITIES.ilom;
    const messages = [
        { role: 'system', content: `${systemPrompt}
Never include <think>, <details>, or hidden reasoning in responses. Reply once with the final answer only.` },
        ...history.slice(-MAX_HISTORY).map((h) => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: String(h.content || '').slice(0, 4000)
        }))
    ];

    const { data } = await axios.post(
        `${GROQ_BASE_URL}/chat/completions`,
        {
            model: GROQ_MODEL,
            messages,
            temperature: LOW_RESOURCE_MODE ? 0.4 : 0.6,
            max_tokens: LOW_RESOURCE_MODE ? 700 : 1200
        },
        {
            timeout: LOW_RESOURCE_MODE ? 70000 : 120000,
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    const raw = data?.choices?.[0]?.message?.content || '';
    const cleaned = stripTrailingDetailsBlock(String(raw).replace(/<think>[\s\S]*?<\/think>/gi, '').trim());
    if (!cleaned) throw new Error('Empty response from Groq');
    return cleaned;
}

async function getAIResponse(settings, history) {
    return await askOmegaAI(settings.personality, history);
}

async function sendVoiceReply(sock, from, text, quoted) {
    const cleanText = String(text || '').trim().slice(0, LOW_RESOURCE_MODE ? 320 : 600);
    if (!cleanText) return;
    const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Joanna&text=${encodeURIComponent(cleanText)}`;
    const audioRes = await axios.get(ttsUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    await sock.sendMessage(from, {
        audio: Buffer.from(audioRes.data),
        mimetype: 'audio/mpeg',
        ptt: true
    }, { quoted });
}

async function transcribeAudioWithGroq(buffer) {
    if (!GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY for audio transcription');
    const form = new FormData();
    form.append('file', buffer, { filename: 'voice.ogg', contentType: 'audio/ogg' });
    form.append('model', GROQ_AUDIO_MODEL);

    const { data } = await axios.post(
        `${GROQ_BASE_URL}/audio/transcriptions`,
        form,
        {
            timeout: LOW_RESOURCE_MODE ? 70000 : 120000,
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${GROQ_API_KEY}`
            },
            maxBodyLength: Infinity
        }
    );
    return String(data?.text || '').trim();
}

async function extractAudioPrompt(message, sock) {
    const quotedAudio = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage;
    const ownAudio = message.message?.audioMessage;
    if (!quotedAudio && !ownAudio) return '';

    const target = quotedAudio ? { message: { audioMessage: quotedAudio } } : message;
    const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
    return await transcribeAudioWithGroq(buffer);
}

async function analyzeImageWithGemini(buffer, prompt = 'Describe this image in clear detail.') {
    if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');
    const b64 = Buffer.from(buffer).toString('base64');
    const model = String(GEMINI_MODEL || 'gemini-2.0-flash').replace(/^models\//i, '');

    const response = await axios.post(
        `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: 'image/jpeg', data: b64 } }
                ]
            }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 900 }
        },
        { timeout: 120000 }
    );

    const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Image analysis returned empty response');
    return text;
}

function normalizeWeather(data) {
    if (!data) return 'Weather info not available.';
    if (typeof data === 'string') return data;

    const result = data.result || data.data || data.weather || data;
    if (typeof result === 'string') return result;

    const location = result.location?.name || result.city || result.name || result.address || 'Unknown location';
    const current = result.current || result.condition || result.now || result;
    const forecast = Array.isArray(result.forecast) ? result.forecast[0] : null;

    const pieces = [
        `📍 Location: ${location}`,
        `🌡️ Temperature: ${current.temp_c ?? current.temp ?? current.temperature ?? 'N/A'}°C`,
        `🤒 Feels like: ${current.feelslike_c ?? current.feelsLike ?? current.feels_like ?? 'N/A'}°C`,
        `☁️ Condition: ${current.condition?.text ?? current.weather ?? current.description ?? 'N/A'}`,
        `💧 Humidity: ${current.humidity ?? 'N/A'}%`,
        `💨 Wind: ${current.wind_kph ?? current.windSpeed ?? current.wind ?? 'N/A'} km/h`
    ];

    if (forecast) {
        pieces.push(
            `🌅 Sunrise: ${forecast.astro?.sunrise || 'N/A'}`,
            `🌇 Sunset: ${forecast.astro?.sunset || 'N/A'}`
        );
    }

    return pieces.join('\n');
}

async function getWeather(location) {
    try {
        const { data } = await axios.get(`https://arychauhann.onrender.com/api/weather?search=${encodeURIComponent(location)}`, {
            timeout: 45000
        });
        return normalizeWeather(data);
    } catch {
        const fallback = await axios.get(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
            timeout: 30000,
            headers: { 'User-Agent': 'curl/8.0.1' }
        });
        const current = fallback.data?.current_condition?.[0];
        if (!current) return 'Weather service busy.';
        return [
            `📍 Location: ${location}`,
            `🌡️ Temperature: ${current.temp_C || 'N/A'}°C`,
            `🤒 Feels like: ${current.FeelsLikeC || 'N/A'}°C`,
            `☁️ Condition: ${current.weatherDesc?.[0]?.value || 'N/A'}`,
            `💧 Humidity: ${current.humidity || 'N/A'}%`,
            `💨 Wind: ${current.windspeedKmph || 'N/A'} km/h`
        ].join('\n');
    }
}

async function getDownloadUrl(url) {
    const { data } = await axios.get('https://dev-priyanshi.onrender.com/api/alldl', {
        params: { url },
        timeout: 45000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const payload = data?.data || data?.result || data;
    const mediaUrl = payload?.high || payload?.low || payload?.url || payload?.download;
    if (!mediaUrl) throw new Error('No downloadable media URL found');
    return {
        mediaUrl,
        title: payload?.title || 'Downloaded media'
    };
}

function extractBodyText(message, args) {
    const fromArgs = args.join(' ').trim();
    if (fromArgs) return fromArgs;
    const msg = message.message;
    return msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption || msg?.videoMessage?.caption || '';
}

function getQuotedText(message) {
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.quotedMessage) return null;
    const q = ctx.quotedMessage;
    return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || null;
}

function registerReplyHandler(msgId, handler) {
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[msgId] = { command: 'ai', handler };
    setTimeout(() => { if (global.replyHandlers?.[msgId]) delete global.replyHandlers[msgId]; }, REPLY_TTL);
}

function buildChainHandler(sock, from, uid, sender) {
    const isGroup = from.endsWith('@g.us');
    const normSender = normJid(sender);
    const normFrom = normJid(from);

    return async (replyText, replyMessage) => {
        const rawReplySender = replyMessage.key.participant || replyMessage.key.remoteJid;
        const normReply = normJid(rawReplySender);

        if (isGroup) {
            if (normReply !== normSender) return;
        } else {
            if (normReply !== normSender && normReply !== normFrom) return;
        }

        let userText = replyText?.trim();
        if (!userText) {
            try {
                userText = await extractAudioPrompt(replyMessage, sock);
            } catch (err) {
                return await sock.sendMessage(from, { text: `❌ Voice transcription failed: ${err.message}` }, { quoted: replyMessage });
            }
        }
        if (!userText) return;

        if (userText.toLowerCase() === 'clear') {
            await saveHistory(uid, []);
            return await sock.sendMessage(from, { text: 'Memory cleared.' }, { quoted: replyMessage });
        }

        try {
            const settings = await loadSettings(uid);
            const history = await loadHistory(uid);
            history.push({ role: 'user', content: userText });
            const aiText = await getAIResponse(settings, history);
            history.push({ role: 'assistant', content: aiText });
            await saveHistory(uid, history);
            const mentions = replyMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const sent = await sock.sendMessage(from, { text: aiText, mentions }, { quoted: replyMessage });
            if (settings.voiceMode) {
                await sendVoiceReply(sock, from, aiText, replyMessage);
            }
            registerReplyHandler(sent.key.id, buildChainHandler(sock, from, uid, sender));
        } catch (err) {
            const errText = `❌ Error: ${err.message || 'Could not get response'}`;
            await sock.sendMessage(from, { text: errText }, { quoted: replyMessage });
        }
    };
}

function buildHelp(settings, historyLen, prefix) {
    const p = prefix || '.';
    return [
        `🤖 AI Assistant`,
        ``,
        `Personality: ${settings.personality}`,
        `Voice notes: ${settings.voiceMode ? 'ON' : 'OFF'}`,
        `Memory:      ${historyLen} messages`,
        ``,
        `${p}ai <question>`,
        `${p}ai clear`,
        `${p}ai settings`,
        `${p}ai -reset`,
        `${p}ai vn on`,
        `${p}ai vn off`,
        `${p}ai -mode:<name>`,
        ``,
        `Personalities: ${Object.keys(PERSONALITIES).join(', ')}`,
        ``,
        `Reply to any AI message to continue the conversation.`
    ].join('\n');
}

export default {
    name: 'ai',
    aliases: ['ask', 'chat', 'gpt', 'chatgpt', 'gemini', 'bot'],
    category: 'ai',
    description: 'Chat with AI with memory, personalities and reply chains',
    usage: 'ai <question>',
    cooldown: 2,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender, prefix }) {
        const uid = sender;
        let body = extractBodyText(message, args);
        if (!body) {
            try { body = await extractAudioPrompt(message, sock); } catch {}
        }

        const quotedText = getQuotedText(message);
        if (quotedText && body) body = `Context: "${quotedText}"\n\nQuestion: ${body}`;
        else if (quotedText && !body) body = `Explain or comment on this: "${quotedText}"`;

        const settings = await loadSettings(uid);

        if (!body || body.toLowerCase() === 'help') {
            const history = await loadHistory(uid);
            return await sock.sendMessage(from, { text: buildHelp(settings, history.length, prefix) }, { quoted: message });
        }

        if (body.toLowerCase() === 'clear') {
            await saveHistory(uid, []);
            return await sock.sendMessage(from, { text: '✅ Memory cleared.' }, { quoted: message });
        }

        if (body.toLowerCase() === 'settings' || body.toLowerCase() === 'status') {
            const history = await loadHistory(uid);
            return await sock.sendMessage(from, {
                text: [
                    `🤖 Your AI Settings`,
                    `Personality: ${settings.personality}`,
                    `Memory:      ${history.length} messages`,
                    `Voice notes: ${settings.voiceMode ? 'ON' : 'OFF'}`
                ].join('\n')
            }, { quoted: message });
        }

        if (body.toLowerCase() === '-reset') {
            await saveSettings(uid, { ...DEFAULT_SETTINGS });
            await saveHistory(uid, []);
            return await sock.sendMessage(from, { text: '✅ Settings and memory reset.' }, { quoted: message });
        }

        if (/^(weather|forecast)\s+/i.test(body)) {
            const location = body.replace(/^(weather|forecast)\s+/i, '').trim();
            const weather = await getWeather(location || 'Nigeria');
            return await sock.sendMessage(from, { text: `🌤️ Weather Update\n\n${weather}` }, { quoted: message });
        }

        if (/^(dl|download)\s+/i.test(body)) {
            const url = body.replace(/^(dl|download)\s+/i, '').trim();
            if (!url) return await sock.sendMessage(from, { text: '❌ Provide a valid URL.' }, { quoted: message });
            await sock.sendMessage(from, { text: '⏳ Fetching media...' }, { quoted: message });
            try {
                const media = await getDownloadUrl(url);
                return await sock.sendMessage(from, {
                    video: { url: media.mediaUrl },
                    caption: `📥 ${media.title}\n🔗 ${url}`
                }, { quoted: message });
            } catch (error) {
                return await sock.sendMessage(from, { text: `❌ Download failed.\n${error.message}` }, { quoted: message });
            }
        }

        if (body.toLowerCase().startsWith('vn ')) {
            const mode = body.toLowerCase().split(/\s+/)[1];
            settings.voiceMode = mode === 'on';
            await saveSettings(uid, settings);
            return await sock.sendMessage(from, {
                text: `✅ Voice note mode ${settings.voiceMode ? 'enabled' : 'disabled'}.`
            }, { quoted: message });
        }

        if (body.startsWith('-mode:')) {
            const mode = body.slice(6).trim().toLowerCase();
            if (!PERSONALITIES[mode])
                return await sock.sendMessage(from, { text: `Available personalities:\n${Object.keys(PERSONALITIES).join(', ')}` }, { quoted: message });
            settings.personality = mode;
            await saveSettings(uid, settings);
            return await sock.sendMessage(from, { text: `✅ Personality set to: ${mode}` }, { quoted: message });
        }

        const quotedImage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        const directImage = message.message?.imageMessage;
        if (quotedImage || directImage) {
            await sock.sendMessage(from, { text: '📸 Analyzing image, please wait...' }, { quoted: message });
            try {
                const target = quotedImage ? { message: { imageMessage: quotedImage } } : message;
                const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                const prompt = body && body.toLowerCase() !== 'ai' ? body : 'Describe this image clearly and mention important details.';
                const explanation = await analyzeImageWithGemini(buffer, prompt);
                return await sock.sendMessage(from, { text: `🖼️ ${explanation}` }, { quoted: message });
            } catch (error) {
                return await sock.sendMessage(from, { text: `❌ Image analysis failed: ${error.message}` }, { quoted: message });
            }
        }

        try {
            const history = await loadHistory(uid);
            history.push({ role: 'user', content: body });
            const aiText = await getAIResponse(settings, history);
            if (!aiText) throw new Error('Empty response received');
            history.push({ role: 'assistant', content: aiText });
            await saveHistory(uid, history);
            const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const sent = await sock.sendMessage(from, { text: aiText, mentions }, { quoted: message });
            if (settings.voiceMode || /start responding with vn/i.test(body)) {
                settings.voiceMode = true;
                await saveSettings(uid, settings);
                await sendVoiceReply(sock, from, aiText, message);
            }
            registerReplyHandler(sent.key.id, buildChainHandler(sock, from, uid, sender));
        } catch (err) {
            const errText = `❌ AI Error: ${err.message || 'Unknown error'}\n\nTry again shortly.`;
            await sock.sendMessage(from, { text: errText }, { quoted: message });
        }
    }
};
