import fs from 'fs-extra';
import path from 'path';
import logger from '../utils/logger.js';
import { clearAllPairedSessions, generatePairingCode } from './pairingService.js';

const TELEGRAM_API = 'https://api.telegram.org';
const STORE_FILE = path.join(process.cwd(), 'data', 'telegram-pairs.json');
const OMEGA_DEFAULT_TIMEOUT_MS = 120000;

function nowISO() {
    return new Date().toISOString();
}

function normalizeTelegramToken(value = '') {
    return String(value || '')
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/^bot/i, '')
        .replace(/^:/, '');
}

function resolveTelegramToken(primaryToken = '', botId = '') {
    const rawToken = String(primaryToken || '').trim().replace(/^['"]|['"]$/g, '');
    const rawBotId = String(botId || '').trim().replace(/^['"]|['"]$/g, '').replace(/^bot/i, '').replace(/:$/, '');

    if (!rawToken && !rawBotId) return '';

    // Full BotFather token already provided
    if (/^\d+:[A-Za-z0-9_-]{20,}$/.test(rawToken)) return rawToken;

    const normalizedSecret = normalizeTelegramToken(rawToken);
    if (rawBotId && normalizedSecret) return `${rawBotId}:${normalizedSecret}`;

    return normalizedSecret;
}

function resolveTelegramTokenFromEnv() {
    const tokenCandidates = [
        process.env.TELEGRAM_BOT_TOKEN,
        process.env.TELEGRAM_TOKEN,
        process.env.TG_BOT_TOKEN,
        process.env.BOT_TOKEN
    ];
    const idCandidates = [
        process.env.TELEGRAM_BOT_ID,
        process.env.TELEGRAM_ID,
        process.env.TG_BOT_ID
    ];

    const token = tokenCandidates.find((x) => String(x || '').trim()) || '';
    const botId = idCandidates.find((x) => String(x || '').trim()) || '';
    return resolveTelegramToken(token, botId);
}

function normalizeNumber(value = '') {
    const clean = String(value || '').replace(/\D/g, '');
    if (clean.length < 10 || clean.length > 15) return null;
    return clean;
}

function toWaJid(number = '') {
    const clean = normalizeNumber(number);
    if (!clean) return null;
    return `${clean}@s.whatsapp.net`;
}

async function loadStore() {
    try {
        const data = await fs.readJSON(STORE_FILE);
        return data && typeof data === 'object' ? data : { pairs: [], chats: [] };
    } catch {
        return { pairs: [], chats: [] };
    }
}

async function saveStore(store) {
    await fs.ensureDir(path.dirname(STORE_FILE));
    await fs.writeJSON(STORE_FILE, store, { spaces: 2 });
}

async function updatePairRecord(id, updater) {
    if (!id) return null;
    const store = await loadStore();
    const idx = (store.pairs || []).findIndex((x) => x.id === id);
    if (idx < 0) return null;
    const current = store.pairs[idx];
    const next = typeof updater === 'function' ? updater(current) : updater;
    store.pairs[idx] = { ...current, ...(next || {}) };
    await saveStore(store);
    return store.pairs[idx];
}

function isAdmin(userId, adminIds = []) {
    return adminIds.includes(String(userId));
}

function buildMenu(user, runtimeText = '') {
    return [
        '🖼 ╭─────────────────❏',
        '│  ✦ ilom ²⁰²⁶ ✦',
        '│  ',
        '│  👑 Owner: Raphael ilom x brokenvzn',
        `│  ⏱️ Runtime: ${runtimeText}`,
        `│  👤 User: ${user?.first_name || 'User'}`,
        `│  🆔 User ID: ${user?.id || 'unknown'}`,
        '│',
        '├─────────────────❏',
        '│  📱 USER COMMANDS',
        '│  /pair <number>',
        '│  /pairs',
        '│  /delpair <id>',
        '│  /ilomai <prompt>',
        '│  /tts <text>',
        '│  /img <prompt>',
        '│',
        '├─────────────────❏',
        '│  🛡️ ADMIN COMMANDS',
        '│  /listpair',
        '│  /broadcast <text>',
        '│  /clearsession',
        '│',
        '╰─────────────────❏',
        '│  Presented by ILOM BOT INC.',
        '│  © 2026',
        '╰─────────────────'
    ].join('\n');
}

async function tgCall(token, method, payload = {}) {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
        throw new Error(data.description || `Telegram ${method} failed`);
    }
    return data.result;
}

function menuKeyboard() {
    return {
        keyboard: [
            [{ text: '/pair 2349031575131' }],
            [{ text: '/pairs' }, { text: '/delpair' }],
            [{ text: '/ilomai Heyoo' }, { text: '/img Cute anime cat' }],
            [{ text: '/tts Hello from ilom ai' }],
            [{ text: '/owners' }, { text: '/menu' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };
}

function cleanAiReply(text = '') {
    return String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => {
            if (!line) return false;
            return !/(powered by|creator|api by|provided by|qasim|omegatech|visit|follow .*telegram)/i.test(line);
        })
        .join('\n')
        .trim();
}

function deepValues(input, bucket = []) {
    if (input == null) return bucket;
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
        bucket.push(String(input));
        return bucket;
    }
    if (Array.isArray(input)) {
        for (const item of input) deepValues(item, bucket);
        return bucket;
    }
    if (typeof input === 'object') {
        for (const value of Object.values(input)) deepValues(value, bucket);
    }
    return bucket;
}

function pickTextFromApiResponse(payload) {
    if (!payload) return '';
    const preferred = [
        payload?.response,
        payload?.answer,
        payload?.data?.response,
        payload?.data?.answer,
        payload?.data?.text,
        payload?.result?.response,
        payload?.result?.text,
        payload?.text,
        payload?.message
    ].find((x) => typeof x === 'string' && x.trim());

    if (preferred) return cleanAiReply(preferred);

    const values = deepValues(payload)
        .map((x) => x.trim())
        .filter((x) => x.length > 0 && x.length < 6000);

    const best = values.find((x) => /[a-z0-9]/i.test(x) && !/^https?:\/\//i.test(x));
    return cleanAiReply(best || '');
}

function pickUrlFromApiResponse(payload) {
    const values = deepValues(payload);
    const direct = values.find((x) => /^https?:\/\/\S+/i.test(String(x).trim()));
    if (direct) return String(direct).trim();

    const embedded = values
        .map((x) => String(x))
        .map((x) => x.match(/https?:\/\/[^\s'"<>]+/i)?.[0] || '')
        .find(Boolean);
    const url = embedded || '';
    return url ? String(url).trim() : '';
}

async function omegatechRequest(model, payload = {}, {
    timeoutMs = OMEGA_DEFAULT_TIMEOUT_MS,
    pollMs = 2500,
    maxPolls = 20
} = {}) {
    const apiBase = (process.env.OMEGATECH_API_URL || process.env.OMEGATECH_ENDPOINT || '').trim();
    const apiKey = (process.env.OMEGATECH_API_KEY || process.env.ILOM_API_KEY || '').trim();

    if (apiBase) {
        const headers = {
            'content-type': 'application/json',
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
        };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(apiBase, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model,
                    ...payload
                }),
                signal: controller.signal
            });
            if (!res.ok) throw new Error(`API request failed (${res.status})`);
            let data = await res.json();

            const initialStatus = String(data?.status || data?.state || '').toLowerCase();
            const jobId = data?.jobId || data?.id || data?.taskId || null;
            if (jobId && /(queued|pending|processing|running)/i.test(initialStatus)) {
                const statusUrl = `${apiBase.replace(/\/$/, '')}/${jobId}`;
                for (let i = 0; i < maxPolls; i += 1) {
                    await new Promise((resolve) => setTimeout(resolve, pollMs));
                    const statusRes = await fetch(statusUrl, { headers, signal: controller.signal });
                    if (!statusRes.ok) continue;
                    data = await statusRes.json();
                    const s = String(data?.status || data?.state || '').toLowerCase();
                    if (!/(queued|pending|processing|running)/i.test(s)) break;
                }
            }

            return data;
        } finally {
            clearTimeout(timeout);
        }
    }

    if (/claude|chat|ai/i.test(model)) {
        const prompt = payload?.prompt || payload?.text;
        const url = `https://api.qasimdev.dpdns.org/api/gemini/flash?apiKey=qasim-dev&text=${encodeURIComponent(prompt || '')}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Chat API failed (${res.status})`);
        return await res.json();
    }

    if (/image|nano|banana|img/i.test(model)) {
        const prompt = payload?.prompt || payload?.text || '';
        return {
            url: `https://theone-fast-image-gen.vercel.app/download-image?prompt=${encodeURIComponent(prompt)}&expires=${Date.now() + 120000}&size=16%3A9`
        };
    }

    if (/tts|voice|speech/i.test(model)) {
        return {
            text: payload?.text || ''
        };
    }

    throw new Error('No AI endpoint configured. Set OMEGATECH_API_URL to enable Telegram AI/TTS/Image APIs.');
}

async function waitForConnectedSock(getSock, {
    timeoutMs = 20000,
    pollMs = 500
} = {}) {
    const startedAt = Date.now();
    while ((Date.now() - startedAt) < timeoutMs) {
        const sock = typeof getSock === 'function' ? getSock() : null;
        if (sock?.user?.id) return sock;
        await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
    return null;
}

export async function startTelegramPairBot({
    getSock,
    ownerNumbers = [],
    token = process.env.TELEGRAM_BOT_TOKEN || resolveTelegramTokenFromEnv(),
    botId = process.env.TELEGRAM_BOT_ID,
    adminIds = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map((x) => x.trim()).filter(Boolean)
} = {}) {
    token = resolveTelegramToken(token, botId);

    if (!token) {
        logger.info('Telegram pair bot disabled (Telegram token not set). Supported env keys: TELEGRAM_BOT_TOKEN, TELEGRAM_TOKEN, TG_BOT_TOKEN, BOT_TOKEN.');
        return null;
    }

    if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
        logger.warn('Telegram pair bot disabled: invalid Telegram token format.');
        logger.warn('Use TELEGRAM_BOT_ID=<bot id> and TELEGRAM_BOT_TOKEN=<secret>, or TELEGRAM_BOT_TOKEN=<bot_id:secret>.');
        return null;
    }

    let running = true;
    let offset = 0;
    const pendingPairRequests = new Map();
    const startedAt = Date.now();

    try {
        await tgCall(token, 'getMe');
        logger.info('Telegram pair bot started.');
    } catch (error) {
        logger.warn(`Telegram pair bot disabled: ${error.message}`);
        return null;
    }

    const runtimeText = () => {
        const sec = Math.floor((Date.now() - startedAt) / 1000);
        const min = Math.floor(sec / 60);
        const rem = sec % 60;
        return `${min}m ${rem}s`;
    };

    const sendText = async (chatId, text, extra = {}) => {
        await tgCall(token, 'sendMessage', {
            chat_id: chatId,
            text,
            ...extra
        });
    };

    const sendMenu = async (chatId, user) => {
        await sendText(chatId, buildMenu(user, runtimeText()), {
            reply_markup: menuKeyboard()
        });
    };

    const sendWhatsappNotice = async ({ number, code, tgUser, chatId }) => {
        const sock = await waitForConnectedSock(getSock, {
            timeoutMs: 20000,
            pollMs: 500
        });
        if (!sock?.user?.id) return false;
        const jid = toWaJid(number);
        if (!jid) return false;

        await sock.sendMessage(jid, {
            text: [
                '🔔 Pairing notification from Telegram helper.',
                `Code: ${code}`,
                `Requested by: ${tgUser?.username || tgUser?.first_name || 'Telegram user'} (${tgUser?.id || 'unknown'})`,
                `Requested at: ${nowISO()}`,
                '',
                'Open Telegram, copy your code, then finish link in WhatsApp > Linked devices > Link with phone number.'
            ].join('\n')
        });

        await sendText(chatId, `✅ Sent WhatsApp notification to +${number}. Check that chat on WhatsApp now.`);
        return true;
    };

    const handlePair = async (chatId, user, text) => {
        const raw = text.replace(/^\s*[./]pair(?:@\w+)?\s*/i, '').trim();
        const number = normalizeNumber(raw);
        if (!number) {
            pendingPairRequests.set(String(chatId), {
                userId: String(user.id),
                requestedAt: Date.now()
            });
            return sendText(
                chatId,
                [
                    '📱 Send the WhatsApp number to pair.',
                    'Example: 2347046987550',
                    '',
                    'Use full country code (10-15 digits).',
                    'Send /cancel to stop.'
                ].join('\n')
            );
        }
        pendingPairRequests.delete(String(chatId));
        let pairId = null;

        try {
            const store = await loadStore();
            store.chats = Array.from(new Set([...(store.chats || []), String(chatId)]));
            store.pairs = (store.pairs || []);
            pairId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            store.pairs.push({
                id: pairId,
                tgUserId: String(user.id),
                tgUsername: user.username || user.first_name || 'unknown',
                number,
                code: null,
                sessionPath: null,
                createdAt: nowISO(),
                status: 'creating_code'
            });
            await saveStore(store);

            const paired = await generatePairingCode(number, {
                onCodeSent: async ({ number: pairedNumber, code, sessionPath }) => {
                    await updatePairRecord(pairId, {
                        number: pairedNumber,
                        code,
                        sessionPath: sessionPath || null,
                        codeSentAt: nowISO(),
                        status: 'code_sent'
                    });
                },
                onLinked: async ({ sessionPath }) => {
                    await updatePairRecord(pairId, {
                        sessionPath: sessionPath || null,
                        linkedAt: nowISO(),
                        status: 'linked_connected'
                    });
                    await sendText(chatId, `✅ Link successful for +${number}. Session saved and connected automatically.`);
                }
            });

            await updatePairRecord(pairId, {
                number: paired.number,
                code: paired.code,
                sessionPath: paired.sessionPath || null,
                status: 'code_sent'
            });

            let waNoticeSent = false;
            try {
                waNoticeSent = await sendWhatsappNotice({
                    number: paired.number,
                    code: paired.code,
                    tgUser: user,
                    chatId
                });
            } catch (error) {
                logger.warn(`WhatsApp pair notice failed for +${paired.number}: ${error.message}`);
            }

            if (!waNoticeSent) {
                await sendText(chatId, '⚠️ WhatsApp notification could not be sent automatically (bot may be offline), but your pair code is ready below.');
            }

            return sendText(
                chatId,
                [
                    `🔹 Pair Code for +${paired.number}:`,
                    `${paired.code}`,
                    '',
                    '🔹 How to Link:',
                    '1. Open WhatsApp on your phone.',
                    '2. Go to Settings > Linked Devices.',
                    '3. Tap Link a Device then Link with phone number.',
                    `4. Enter this code: ${paired.code}`,
                    '',
                    '⏳ Code expires in about 2 minutes.',
                    '✅ After successful link, this account session is saved and auto-starts on this panel.'
                ].join('\n')
            );
        } catch (error) {
            if (pairId) {
                await updatePairRecord(pairId, {
                    status: 'failed',
                    error: String(error.message || error),
                    failedAt: nowISO()
                }).catch(() => {});
            }
            return sendText(chatId, `❌ Pair failed: ${error.message}`);
        }
    };

    const handleDeletePair = async (chatId, user, text) => {
        const id = text.replace(/^\/delpair(@\w+)?/i, '').trim();
        const store = await loadStore();
        const before = store.pairs?.length || 0;

        if (id) {
            store.pairs = (store.pairs || []).filter((x) => x.id !== id || x.tgUserId !== String(user.id));
        } else {
            store.pairs = (store.pairs || []).filter((x) => x.tgUserId !== String(user.id));
        }

        await saveStore(store);
        return sendText(chatId, before === store.pairs.length ? 'ℹ️ No saved pair record found.' : '✅ Pair record removed.');
    };


    const handlePairs = async (chatId, user) => {
        const store = await loadStore();
        const mine = (store.pairs || []).filter((x) => x.tgUserId === String(user.id)).slice(-25).reverse();
        if (!mine.length) return sendText(chatId, 'ℹ️ You have no saved pair records yet.');
        const rows = mine.map((x, i) => `${i + 1}. ${x.number} • ${x.status} • id:${x.id}`);
        return sendText(chatId, `📄 Your pair records:

${rows.join('\n')}`);
    };

    const handleListPair = async (chatId, user) => {
        if (!isAdmin(user.id, adminIds)) return sendText(chatId, '❌ Admin only.');
        const store = await loadStore();
        const rows = (store.pairs || []).slice(-25).map((x, i) => `${i + 1}. ${x.number} • ${x.tgUsername} • ${x.status}`);
        return sendText(chatId, rows.length ? `📄 Pair records:\n\n${rows.join('\n')}` : 'No pair records yet.');
    };

    const handleBroadcast = async (chatId, user, text) => {
        if (!isAdmin(user.id, adminIds)) return sendText(chatId, '❌ Admin only.');
        const message = text.replace(/^\/broadcast(@\w+)?/i, '').trim();
        if (!message) return sendText(chatId, '❌ Usage: /broadcast <text>');

        const store = await loadStore();
        const chats = (store.chats || []).filter(Boolean);
        let sent = 0;
        for (const c of chats) {
            try {
                await sendText(c, `📢 Broadcast:\n\n${message}`);
                sent += 1;
            } catch {}
        }
        return sendText(chatId, `✅ Broadcast sent to ${sent} chats.`);
    };

    const handleClearSession = async (chatId, user) => {
        if (!isAdmin(user.id, adminIds)) return sendText(chatId, '❌ Admin only.');

        const store = await loadStore();
        const totalPairs = (store.pairs || []).length;

        await clearAllPairedSessions();
        store.pairs = [];
        await saveStore(store);

        return sendText(chatId, `✅ Cleared all paired sessions and removed ${totalPairs} saved pair record(s).`);
    };

    const handleIlomAi = async (chatId, text) => {
        const prompt = text.replace(/^\/ilomai(@\w+)?/i, '').trim();
        if (!prompt) return sendText(chatId, '❌ Usage: /ilomai <prompt>');

        try {
            await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'typing' });
            const payload = await omegatechRequest('Claude-pro', {
                prompt,
                sessionId: String(chatId)
            });
            const answer = pickTextFromApiResponse(payload) || '⚠️ AI returned an empty response.';
            return sendText(chatId, `🤖 Ilom AI:\n\n${answer}`);
        } catch (error) {
            return sendText(chatId, `❌ Ilom AI error: ${error.message}`);
        }
    };

    const handleTextToSpeech = async (chatId, text) => {
        const prompt = text.replace(/^\/tts(@\w+)?/i, '').trim();
        if (!prompt) return sendText(chatId, '❌ Usage: /tts <text>');

        try {
            await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'record_voice' });
            const payload = await omegatechRequest('Gemini-tts', { text: prompt });
            const audioUrl = pickUrlFromApiResponse(payload);
            if (!audioUrl) {
                const fallback = pickTextFromApiResponse(payload);
                return sendText(chatId, fallback ? `🔊 TTS result:\n${fallback}` : '⚠️ TTS completed but no audio URL was returned.');
            }

            await tgCall(token, 'sendVoice', {
                chat_id: chatId,
                voice: audioUrl,
                caption: '🔊 Gemini human-like voice (TTS)'
            });
            return null;
        } catch (error) {
            return sendText(chatId, `❌ TTS error: ${error.message}`);
        }
    };

    const handleImageGen = async (chatId, text) => {
        const prompt = text.replace(/^\/img(@\w+)?/i, '').trim();
        if (!prompt) return sendText(chatId, '❌ Usage: /img <prompt>');

        try {
            await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'upload_photo' });
            const payload = await omegatechRequest('nano-banana-pro', { prompt });
            const imageUrl = pickUrlFromApiResponse(payload);
            if (!imageUrl) {
                const fallback = pickTextFromApiResponse(payload);
                return sendText(chatId, fallback ? `🖼️ Image API response:\n${fallback}` : '⚠️ Image generation completed but no image URL was returned.');
            }

            await tgCall(token, 'sendPhoto', {
                chat_id: chatId,
                photo: imageUrl,
                caption: `🖼️ Prompt: ${prompt}`
            });
            return null;
        } catch (error) {
            return sendText(chatId, `❌ Image generation error: ${error.message}`);
        }
    };

    const handleNormalChatAi = async (chatId, text) => {
        if (!text || text.startsWith('/')) return null;
        try {
            await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'typing' });
            const payload = await omegatechRequest('Claude-pro', {
                prompt: text,
                sessionId: String(chatId)
            });
            const answer = pickTextFromApiResponse(payload) || '⚠️ AI returned an empty response.';
            return sendText(chatId, `🤖 ${answer}`);
        } catch (error) {
            return sendText(chatId, `❌ Chat AI error: ${error.message}`);
        }
    };

    const handleUpdate = async (update) => {
        const msg = update?.message;
        const text = msg?.text || '';
        const chatId = msg?.chat?.id;
        const user = msg?.from;
        if (!chatId || !text || !user) return;
        const pendingForChat = pendingPairRequests.get(String(chatId));

        if (/^\/cancel\b/i.test(text)) {
            if (pendingForChat) {
                pendingPairRequests.delete(String(chatId));
                return sendText(chatId, '✅ Pair request cancelled.');
            }
            return sendText(chatId, 'ℹ️ No pending pair request.');
        }

        if (
            pendingForChat
            && pendingForChat.userId === String(user.id)
            && !text.startsWith('/')
        ) {
            return handlePair(chatId, user, `/pair ${text}`);
        }

        if (/^\/start/i.test(text) || /^\/menu/i.test(text)) {
            return sendMenu(chatId, user);
        }
        if (/^[./]pair\b/i.test(text)) return handlePair(chatId, user, text);
        if (/^\/delpair\b/i.test(text)) return handleDeletePair(chatId, user, text);
        if (/^\/pairs\b/i.test(text)) return handlePairs(chatId, user);
        if (/^\/listpair\b/i.test(text)) return handleListPair(chatId, user);
        if (/^\/broadcast\b/i.test(text)) return handleBroadcast(chatId, user, text);
        if (/^\/clearsession\b/i.test(text)) return handleClearSession(chatId, user);
        if (/^\/ilomai\b/i.test(text)) return handleIlomAi(chatId, text);
        if (/^\/tts\b/i.test(text)) return handleTextToSpeech(chatId, text);
        if (/^\/img\b/i.test(text)) return handleImageGen(chatId, text);
        if (/^\/owners\b/i.test(text)) return sendText(chatId, `👑 Owners:\n${ownerNumbers.join('\n')}`);
        return handleNormalChatAi(chatId, text);
    };

    const loop = async () => {
        while (running) {
            try {
                const updates = await tgCall(token, 'getUpdates', {
                    timeout: 25,
                    offset,
                    allowed_updates: ['message']
                });
                for (const u of updates) {
                    offset = u.update_id + 1;
                    await handleUpdate(u);
                }
            } catch (error) {
                logger.warn(`Telegram bot polling error: ${error.message}`);
                await new Promise((r) => setTimeout(r, 3000));
            }
        }
    };

    loop().catch((error) => logger.error('Telegram bot loop crashed:', error));

    return {
        stop: () => { running = false; }
    };
}
