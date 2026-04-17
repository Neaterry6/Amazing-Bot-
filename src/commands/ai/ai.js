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
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://qwen.aikit.club/v1';
const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.QWEN_ACCESS_TOKEN || '';
const QWEN_MODEL = process.env.QWEN_MODEL || 'Qwen3.6-Plus';
const QWEN_IMAGE_MODEL = process.env.QWEN_IMAGE_MODEL || 'Qwen3.5-Plus';
const QWEN_VIDEO_MODEL = process.env.QWEN_VIDEO_MODEL || 'Qwen3.5-Plus';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const CLAUDE_API_BASE_URL = process.env.CLAUDE_API_BASE_URL || 'https://omegatech-api.dixonomega.tech/api/ai';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'Claude-pro';
const CLAUDE_SESSION_FILE = path.join(DATA_DIR, 'claude_sessions.json');

const PERSONALITIES = {
    normal:    'You are a helpful, friendly AI assistant. Be concise and clear.',
    ilom:      'You are Ilom Bot, a confident and intelligent assistant. Be smooth, smart and direct. Keep replies sharp.',
    coder:     'You are an elite senior software engineer. Provide clean optimized code with no fluff unless asked.',
    coderpro:  'You are Coder Pro: elite software architect, debugger, reverse engineer, and web scraper expert. Return production-ready code, clear file layout, and concise steps.' ,
    assistant: 'You are a professional assistant. Structured, straight to the point, always helpful.',
    funny:     'You are a witty comedian AI. Keep it clever and funny but still helpful.',
    teacher:   'You are a patient teacher. Explain clearly with examples and break down complex topics simply.',
    savage:    'You are brutally honest with no sugarcoating but always accurate and helpful.',
    scraper:   'You are a web scraping and data extraction specialist. Return clean selectors, extraction logic, and endpoint findings with concise notes.'
};

const QWEN_HELP_MODELS = [
    'Qwen3.6-Plus', 'Qwen3.5-Plus', 'Qwen3.5-Flash', 'Qwen3.5-397B-A17B',
    'Qwen3.5-122B-A10B', 'Qwen3.5-35B-A3B', 'Qwen3.5-27B', 'Qwen3-Max',
    'Qwen3-Coder', 'Qwen3-Coder-Flash', 'Qwen3-235B-A22B-2507', 'Qwen3-30B-A3B-2507',
    'Qwen3-Omni-Flash', 'Qwen3-VL-235B-A22B', 'Qwen3-VL-32B', 'Qwen3-VL-30B-A3B',
    'Qwen3-Next-80B-A3B', 'Qwen2.5-Max', 'Qwen2.5-Plus', 'Qwen2.5-Turbo',
    'Qwen2.5-Coder-32B-Instruct', 'Qwen2.5-VL-32B-Instruct', 'Qwen2.5-Omni-7B',
    'Qwen-Deep-Research', 'Qwen-Web-Dev', 'Qwen-Full-Stack', 'Qwen-Slides'
];

const DEFAULT_SETTINGS = {
    personality: 'ilom',
    voiceMode: false,
    provider: 'qwen',
    model: '',
    scraperMode: false
};

const PROVIDER_ALIASES = {
    qwen: 'qwen',
    groq: 'groq',
    grog: 'groq',
    gemini: 'gemini',
    claude: 'claude',
    cloudpro: 'claude'
};

const PROVIDER_DEFAULT_MODELS = {
    qwen: QWEN_MODEL,
    groq: GROQ_MODEL,
    gemini: GEMINI_MODEL,
    claude: CLAUDE_MODEL
};

function delay(ms = 1200) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function loadClaudeSession(uid) {
    await ensureDir();
    try {
        const all = await fs.readJSON(CLAUDE_SESSION_FILE);
        return all?.[uid] || null;
    } catch {
        return null;
    }
}

async function saveClaudeSession(uid, sessionId) {
    await ensureDir();
    let all = {};
    try { all = await fs.readJSON(CLAUDE_SESSION_FILE); } catch {}
    if (!sessionId) delete all[uid];
    else all[uid] = sessionId;
    await fs.writeJSON(CLAUDE_SESSION_FILE, all, { spaces: 2 });
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

function removeMarkdownAsterisks(text) {
    return String(text || '').replace(/\*/g, '');
}

async function askQwenAI(personality, history, settings) {
    const systemPrompt = PERSONALITIES[personality] || PERSONALITIES.ilom;
    const messages = [
        { role: 'system', content: `${systemPrompt}
Never include <think>, <details>, or hidden reasoning in responses. Reply once with the final answer only.` },
        ...history.slice(-MAX_HISTORY).map((h) => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: String(h.content || '').slice(0, 4000)
        }))
    ];

    if (!QWEN_API_KEY) throw new Error('Missing QWEN_ACCESS_TOKEN / QWEN_API_KEY');
    const payload = {
        model: settings?.model || QWEN_MODEL,
        messages,
        temperature: LOW_RESOURCE_MODE ? 0.4 : 0.6,
        max_tokens: LOW_RESOURCE_MODE ? 1200 : 2600
    };
    if (settings?.scraperMode) payload.tools = [{ type: 'web_search' }];

    const { data } = await axios.post(
        `${QWEN_BASE_URL}/chat/completions`,
        payload,
        {
            timeout: LOW_RESOURCE_MODE ? 70000 : 120000,
            headers: {
                Authorization: `Bearer ${QWEN_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );
    const raw = data?.choices?.[0]?.message?.content || '';
    const cleaned = stripTrailingDetailsBlock(String(raw).replace(/<think>[\s\S]*?<\/think>/gi, '').trim());
    if (!cleaned) throw new Error('Empty response from Qwen');
    return removeMarkdownAsterisks(cleaned);
}

async function askGroqAI(personality, history, settings) {
    const systemPrompt = PERSONALITIES[personality] || PERSONALITIES.ilom;
    const messages = [
        { role: 'system', content: `${systemPrompt}
Never include <think>, <details>, or hidden reasoning in responses. Reply once with the final answer only.` },
        ...history.slice(-MAX_HISTORY).map((h) => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: String(h.content || '').slice(0, 4000)
        }))
    ];

    if (!GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY in environment');

    const { data } = await axios.post(
        `${GROQ_BASE_URL}/chat/completions`,
        {
            model: settings?.model || GROQ_MODEL,
            messages,
            temperature: LOW_RESOURCE_MODE ? 0.4 : 0.6,
            max_tokens: LOW_RESOURCE_MODE ? 1200 : 2600
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
    return removeMarkdownAsterisks(cleaned);
}

async function askGeminiText(personality, history, settings) {
    if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');
    const model = String(settings?.model || GEMINI_MODEL || 'gemini-2.0-flash').replace(/^models\//i, '');
    const systemPrompt = PERSONALITIES[personality] || PERSONALITIES.ilom;
    const prompt = [
        systemPrompt,
        settings?.scraperMode ? 'Prioritize web freshness and cite URLs in plain text.' : '',
        ...history.slice(-MAX_HISTORY).map((h) => `${h.role}: ${h.content}`),
        'assistant:'
    ].filter(Boolean).join('\n');

    const response = await axios.post(
        `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: LOW_RESOURCE_MODE ? 1200 : 2600 }
        },
        { timeout: 120000 }
    );
    const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Empty response from Gemini');
    return removeMarkdownAsterisks(text);
}

async function qwenImageGeneration(prompt) {
    if (!QWEN_API_KEY) throw new Error('Missing QWEN_API_KEY');
    const { data } = await axios.post(`${QWEN_BASE_URL}/images/generations`, {
        model: QWEN_IMAGE_MODEL,
        prompt,
        size: '1024x1024'
    }, {
        timeout: 180000,
        headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' }
    });
    const imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json || data?.url;
    if (!imageUrl) throw new Error('No generated image returned by Qwen API');
    return imageUrl;
}

async function qwenVideoGeneration(prompt) {
    if (!QWEN_API_KEY) throw new Error('Missing QWEN_API_KEY');
    const { data } = await axios.post(`${QWEN_BASE_URL}/videos/generations`, {
        model: QWEN_VIDEO_MODEL,
        prompt
    }, {
        timeout: 180000,
        headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' }
    });
    return data;
}

async function qwenImageEdit(buffer, prompt) {
    if (!QWEN_API_KEY) throw new Error('Missing QWEN_API_KEY');
    const form = new FormData();
    form.append('model', QWEN_IMAGE_MODEL);
    form.append('prompt', prompt);
    form.append('image', buffer, { filename: 'edit.jpg', contentType: 'image/jpeg' });

    const { data } = await axios.post(`${QWEN_BASE_URL}/images/edits`, form, {
        timeout: 180000,
        headers: { ...form.getHeaders(), Authorization: `Bearer ${QWEN_API_KEY}` }
    });
    const imageUrl = data?.data?.[0]?.url || data?.url;
    if (!imageUrl) throw new Error('No edited image returned by Qwen API');
    return imageUrl;
}

async function askClaudeAI(uid, prompt) {
    const sessionId = await loadClaudeSession(uid);
    const params = { prompt };
    if (sessionId) params.sessionId = sessionId;

    const { data } = await axios.get(
        `${CLAUDE_API_BASE_URL}/${encodeURIComponent(CLAUDE_MODEL)}`,
        {
            params,
            timeout: LOW_RESOURCE_MODE ? 70000 : 120000
        }
    );

    if (data?.sessionId) await saveClaudeSession(uid, data.sessionId);
    const text = String(data?.response || '').trim();
    if (!text) throw new Error('Claude returned empty response');
    return text;
}

async function getAIResponse(uid, settings, history) {
    try {
        const provider = PROVIDER_ALIASES[String(settings?.provider || 'qwen').toLowerCase()] || 'qwen';
        if (provider === 'qwen') return await askQwenAI(settings.personality, history, settings);
        if (provider === 'groq') return await askGroqAI(settings.personality, history, settings);
        if (provider === 'gemini') return await askGeminiText(settings.personality, history, settings);
        return await askClaudeAI(uid, history.filter((h) => h.role !== 'system').map((h) => `${h.role}: ${h.content}`).join('\n').slice(-3500));
    } catch (error) {
        const status = error?.response?.status;
        if (status === 401 || status === 404 || status === 429 || /Missing/i.test(String(error?.message || ''))) {
            const prompt = history.filter((h) => h.role !== 'system').map((h) => `${h.role}: ${h.content}`).join('\n');
            return await askClaudeAI(uid, prompt.slice(-3500));
        }
        throw error;
    }
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

const ASSEMBLY_API_KEY = process.env.ASSEMBLY_API_KEY || '22b87c4a57e04c73914de4b75edd05c1';

async function transcribeAudioWithAssembly(buffer) {
    if (!ASSEMBLY_API_KEY) throw new Error('Missing AssemblyAI key');
    const up = await axios.post('https://api.assemblyai.com/v2/upload', buffer, {
        headers: { authorization: ASSEMBLY_API_KEY, 'content-type': 'application/octet-stream' },
        timeout: 120000,
        maxBodyLength: Infinity
    });
    const audioUrl = up.data?.upload_url;
    if (!audioUrl) throw new Error('Upload failed');

    const create = await axios.post('https://api.assemblyai.com/v2/transcript', {
        audio_url: audioUrl,
        language_detection: true
    }, { headers: { authorization: ASSEMBLY_API_KEY }, timeout: 60000 });

    const id = create.data?.id;
    if (!id) throw new Error('Transcription job failed to start');
    for (let i = 0; i < 20; i++) {
        await delay(2500);
        const check = await axios.get(`https://api.assemblyai.com/v2/transcript/${id}`, {
            headers: { authorization: ASSEMBLY_API_KEY },
            timeout: 60000
        });
        if (check.data?.status === 'completed') return String(check.data?.text || '').trim();
        if (check.data?.status === 'error') throw new Error(check.data?.error || 'Transcription failed');
    }
    throw new Error('Transcription timeout');
}

async function extractAudioPrompt(message, sock) {
    const quotedAudio = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage;
    const ownAudio = message.message?.audioMessage;
    if (!quotedAudio && !ownAudio) return '';

    const target = quotedAudio ? { message: { audioMessage: quotedAudio } } : message;
    const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
    return await transcribeAudioWithAssembly(buffer);
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
            generationConfig: { temperature: 0.5, maxOutputTokens: 4096 }
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

async function sendLongText(sock, from, text, quoted, mentions = []) {
    const cleaned = removeMarkdownAsterisks(String(text || '').trim());
    if (!cleaned) return null;
    const chunks = [];
    const maxLen = 3500;
    for (let i = 0; i < cleaned.length; i += maxLen) chunks.push(cleaned.slice(i, i + maxLen));
    let sent = null;
    for (const chunk of chunks) {
        sent = await sock.sendMessage(from, { text: chunk, mentions }, { quoted });
    }
    return sent;
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
            const aiText = await getAIResponse(uid, settings, history);
            history.push({ role: 'assistant', content: aiText });
            await saveHistory(uid, history);
            const mentions = replyMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const sent = await sendLongText(sock, from, aiText, replyMessage, mentions);
            if (settings.voiceMode) {
                await delay(1300);
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
        `Provider: ${settings.provider || 'qwen'}`,
        `Model: ${settings.model || PROVIDER_DEFAULT_MODELS[settings.provider || 'qwen']}`,
        `Voice notes: ${settings.voiceMode ? 'ON' : 'OFF'}`,
        `Scraper mode: ${settings.scraperMode ? 'ON' : 'OFF'}`,
        `Memory:      ${historyLen} messages`,
        ``,
        `${p}ai <question>`,
        `${p}ai clear`,
        `${p}ai settings`,
        `${p}ai -reset`,
        `${p}ai vn on`,
        `${p}ai vn off`,
        `${p}ai set <provider|personality|model|scraper> <value>`,
        `${p}ai set qwen | groq | gemini | cloudpro`,
        `${p}ai set coderpro | scraper`,
        `${p}ai -mode:<name>`,
        `${p}ai claude <prompt>`,
        `${p}ai list`,
        ``,
        `Personalities: ${Object.keys(PERSONALITIES).join(', ')}`,
        ``,
        `Reply to any AI message to continue the conversation.`
    ].join('\n');
}

function buildAiList() {
    return [
        '🧠 Available AI Providers',
        '',
        `• Qwen Chat: ${QWEN_MODEL} (${QWEN_BASE_URL}) [token auth]`,
        `• Groq Chat: ${GROQ_MODEL} (${GROQ_BASE_URL})`,
        `• Qwen Image: ${QWEN_IMAGE_MODEL} (${QWEN_BASE_URL}/images/generations)`,
        `• Qwen Video: ${QWEN_VIDEO_MODEL} (${QWEN_BASE_URL}/videos/generations)`,
        `• Gemini Vision: ${GEMINI_MODEL} (${GEMINI_BASE_URL})`,
        `• Claude Chat: ${CLAUDE_MODEL} (${CLAUDE_API_BASE_URL})`,
        '',
        `Qwen models:`,
        ...QWEN_HELP_MODELS.map((model) => `- ${model}`),
        '',
        'Tip: use "ai claude <prompt>" for Claude session chat.'
    ].join('\n');
}

function resolveProviderToken(raw) {
    const key = String(raw || '').toLowerCase().trim();
    return PROVIDER_ALIASES[key] || null;
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
                    `Provider: ${settings.provider || 'qwen'}`,
                    `Model: ${settings.model || PROVIDER_DEFAULT_MODELS[settings.provider || 'qwen']}`,
                    `Memory:      ${history.length} messages`,
                    `Voice notes: ${settings.voiceMode ? 'ON' : 'OFF'}`,
                    `Scraper mode: ${settings.scraperMode ? 'ON' : 'OFF'}`
                ].join('\n')
            }, { quoted: message });
        }
        if (body.toLowerCase() === 'list' || body.toLowerCase() === 'models') {
            return await sock.sendMessage(from, { text: buildAiList() }, { quoted: message });
        }

        if (/^set\s+/i.test(body)) {
            const parts = body.split(/\s+/).slice(1);
            const key = (parts[0] || '').toLowerCase();
            const value = parts.slice(1).join(' ').trim();

            const asProvider = resolveProviderToken(key);
            if (asProvider && !value) {
                settings.provider = asProvider;
                settings.model = PROVIDER_DEFAULT_MODELS[asProvider] || settings.model;
                await saveSettings(uid, settings);
                return await sock.sendMessage(from, { text: `✅ Provider set to ${asProvider} (${settings.model}).` }, { quoted: message });
            }

            if (PERSONALITIES[key] && !value) {
                settings.personality = key;
                await saveSettings(uid, settings);
                return await sock.sendMessage(from, { text: `✅ Personality set to ${key}.` }, { quoted: message });
            }

            if (key === 'provider') {
                const provider = resolveProviderToken(value);
                if (!provider) return await sock.sendMessage(from, { text: '❌ Providers: qwen, groq, gemini, cloudpro' }, { quoted: message });
                settings.provider = provider;
                settings.model = PROVIDER_DEFAULT_MODELS[provider] || settings.model;
                await saveSettings(uid, settings);
                return await sock.sendMessage(from, { text: `✅ Provider set to ${provider} (${settings.model}).` }, { quoted: message });
            }

            if (key === 'model') {
                if (!value) return await sock.sendMessage(from, { text: '❌ Usage: ai set model <model-name>' }, { quoted: message });
                settings.model = value;
                await saveSettings(uid, settings);
                return await sock.sendMessage(from, { text: `✅ Model set to ${value}.` }, { quoted: message });
            }

            if (key === 'personality' || key === 'mode') {
                if (!PERSONALITIES[value]) return await sock.sendMessage(from, { text: `❌ Personalities: ${Object.keys(PERSONALITIES).join(', ')}` }, { quoted: message });
                settings.personality = value;
                await saveSettings(uid, settings);
                return await sock.sendMessage(from, { text: `✅ Personality set to ${value}.` }, { quoted: message });
            }

            if (key === 'scraper') {
                const v = value.toLowerCase();
                settings.scraperMode = ['on', 'true', '1', 'yes', 'mode'].includes(v) || value === '';
                await saveSettings(uid, settings);
                return await sock.sendMessage(from, { text: `✅ Scraper mode ${settings.scraperMode ? 'enabled' : 'disabled'}.` }, { quoted: message });
            }
        }

        if (body.toLowerCase() === '-reset') {
            await saveSettings(uid, { ...DEFAULT_SETTINGS });
            await saveHistory(uid, []);
            await saveClaudeSession(uid, null);
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

        if (/^claude\s+/i.test(body)) {
            const prompt = body.replace(/^claude\s+/i, '').trim();
            if (!prompt) return await sock.sendMessage(from, { text: '❌ Provide a prompt for Claude.' }, { quoted: message });
            try {
                const response = await askClaudeAI(uid, prompt);
                const sent = await sendLongText(sock, from, response, message);
                registerReplyHandler(sent.key.id, buildChainHandler(sock, from, uid, sender));
                return;
            } catch (error) {
                return await sock.sendMessage(from, { text: `❌ Claude error: ${error.message}` }, { quoted: message });
            }
        }


        if (/^(img|image|imagine)\s+/i.test(body)) {
            const prompt = body.replace(/^(img|image|imagine)\s+/i, '').trim();
            if (!prompt) return await sock.sendMessage(from, { text: '❌ Provide prompt for image generation.' }, { quoted: message });
            await sock.sendMessage(from, { text: '🎨 Generating image with Qwen... please wait.' }, { quoted: message });
            await delay(1800);
            try {
                const imageUrl = await qwenImageGeneration(prompt);
                return await sock.sendMessage(from, { image: { url: imageUrl }, caption: `🖼️ Qwen Image
Prompt: ${prompt}` }, { quoted: message });
            } catch (error) {
                return await sock.sendMessage(from, { text: `❌ Image generation failed: ${error.message}` }, { quoted: message });
            }
        }

        if (/^(vid|video)\s+/i.test(body)) {
            const prompt = body.replace(/^(vid|video)\s+/i, '').trim();
            if (!prompt) return await sock.sendMessage(from, { text: '❌ Provide prompt for video generation.' }, { quoted: message });
            await sock.sendMessage(from, { text: '🎬 Generating video with Qwen... this may take longer.' }, { quoted: message });
            await delay(2500);
            try {
                const out = await qwenVideoGeneration(prompt);
                const videoUrl = out?.data?.[0]?.url || out?.url || out?.video;
                if (videoUrl) {
                    return await sock.sendMessage(from, { video: { url: videoUrl }, caption: `🎬 Qwen Video
Prompt: ${prompt}` }, { quoted: message });
                }
                return await sock.sendMessage(from, { text: `✅ Video request submitted.
${JSON.stringify(out).slice(0, 3000)}` }, { quoted: message });
            } catch (error) {
                return await sock.sendMessage(from, { text: `❌ Video generation failed: ${error.message}` }, { quoted: message });
            }
        }

        if (/^edit(image)?\s+/i.test(body)) {
            const prompt = body.replace(/^edit(image)?\s+/i, '').trim();
            const quotedImageForEdit = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            const directImageForEdit = message.message?.imageMessage;
            if (!quotedImageForEdit && !directImageForEdit) {
                return await sock.sendMessage(from, { text: '❌ Reply to an image with: ai edit <prompt>' }, { quoted: message });
            }
            await sock.sendMessage(from, { text: '🛠️ Editing image with Qwen...' }, { quoted: message });
            await delay(2000);
            try {
                const target = quotedImageForEdit ? { message: { imageMessage: quotedImageForEdit } } : message;
                const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                const editedUrl = await qwenImageEdit(buffer, prompt || 'Improve image quality while keeping style');
                return await sock.sendMessage(from, { image: { url: editedUrl }, caption: `✅ Image edited
Prompt: ${prompt || 'default'}` }, { quoted: message });
            } catch (error) {
                return await sock.sendMessage(from, { text: `❌ Image edit failed: ${error.message}` }, { quoted: message });
            }
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
                return await sendLongText(sock, from, `🖼️ ${explanation}`, message);
            } catch (error) {
                return await sock.sendMessage(from, { text: `❌ Image analysis failed: ${error.message}` }, { quoted: message });
            }
        }

        try {
            const history = await loadHistory(uid);
            history.push({ role: 'user', content: body });
            const aiText = await getAIResponse(uid, settings, history);
            if (!aiText) throw new Error('Empty response received');
            history.push({ role: 'assistant', content: aiText });
            await saveHistory(uid, history);
            const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const sent = await sendLongText(sock, from, aiText, message, mentions);
            if (settings.voiceMode || /start responding with vn/i.test(body)) {
                settings.voiceMode = true;
                await saveSettings(uid, settings);
                await delay(1300);
                await sendVoiceReply(sock, from, aiText, message);
            }
            registerReplyHandler(sent.key.id, buildChainHandler(sock, from, uid, sender));
        } catch (err) {
            const errText = `❌ AI Error: ${err.message || 'Unknown error'}\n\nTry again shortly.`;
            await sock.sendMessage(from, { text: errText }, { quoted: message });
        }
    }
};
