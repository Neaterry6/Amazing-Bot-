import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';

const DATA_DIR = path.join(process.cwd(), 'data', 'ai');
const HISTORY_FILE = path.join(DATA_DIR, 'ai_history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'ai_settings.json');
const MAX_HISTORY = 20;
const REPLY_TTL = 10 * 60 * 1000;
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

async function askGemini(personality, history) {
    if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');

    const systemPrompt = PERSONALITIES[personality] || PERSONALITIES.ilom;
    const chat = history
        .map((h) => `${h.role === 'assistant' ? 'Assistant' : 'User'}: ${h.content}`)
        .join('\n');

    const prompt = `${systemPrompt}\n\nConversation:\n${chat}\n\nAssistant:`;

    const models = [GEMINI_MODEL, 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let response = null;
    let lastErr = null;

    for (const model of [...new Set(models)]) {
        try {
            response = await axios.post(
                `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 900
                    }
                },
                { timeout: 30000 }
            );
            if (response?.data) break;
        } catch (err) {
            lastErr = err;
            if (err?.response?.status !== 404) throw err;
        }
    }

    if (!response?.data && lastErr) throw lastErr;
    const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    if (!text) throw new Error('Empty response from Gemini');
    return text;
}

async function getAIResponse(settings, history) {
    return await askGemini(settings.personality, history);
}

async function sendVoiceReply(sock, from, text, quoted) {
    const voiceText = encodeURIComponent(String(text).slice(0, 200));
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${voiceText}`;
    await sock.sendMessage(from, {
        audio: { url: ttsUrl },
        mimetype: 'audio/mpeg',
        ptt: true
    }, { quoted });
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

        const userText = replyText?.trim();
        if (!userText) return;

        if (userText.toLowerCase() === 'clear') {
            await saveHistory(uid, []);
            return await sock.sendMessage(from, { text: 'Memory cleared.' }, { quoted: replyMessage });
        }

        await sock.sendMessage(from, { text: '⏳ Thinking...' }, { quoted: replyMessage });

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

        await sock.sendMessage(from, { text: '⏳ Thinking...' }, { quoted: message });

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
