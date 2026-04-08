import fs from 'fs-extra';
import path from 'path';
import logger from '../utils/logger.js';
import { generatePairingCode } from './pairingService.js';

const TELEGRAM_API = 'https://api.telegram.org';
const STORE_FILE = path.join(process.cwd(), 'data', 'telegram-pairs.json');

function nowISO() {
    return new Date().toISOString();
}

function normalizeTelegramToken(value = '') {
    return String(value || '').trim().replace(/^bot/i, '').replace(/^:/, '');
}

function resolveTelegramToken(primaryToken = '', botId = '') {
    const rawToken = String(primaryToken || '').trim();
    const rawBotId = String(botId || '').trim().replace(/^bot/i, '').replace(/:$/, '');

    if (!rawToken && !rawBotId) return '';

    // Full BotFather token already provided
    if (/^\d+:[A-Za-z0-9_-]{20,}$/.test(rawToken)) return rawToken;

    const normalizedSecret = normalizeTelegramToken(rawToken);
    if (rawBotId && normalizedSecret) return `${rawBotId}:${normalizedSecret}`;

    return normalizedSecret;
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
        '│',
        '├─────────────────❏',
        '│  🛡️ ADMIN COMMANDS',
        '│  /listpair',
        '│  /broadcast <text>',
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
            [{ text: '/owners' }, { text: '/menu' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };
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
    token = process.env.TELEGRAM_BOT_TOKEN,
    botId = process.env.TELEGRAM_BOT_ID,
    adminIds = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map((x) => x.trim()).filter(Boolean)
} = {}) {
    token = resolveTelegramToken(token, botId);

    if (!token) {
        logger.info('Telegram pair bot disabled (TELEGRAM_BOT_TOKEN not set)');
        return null;
    }

    if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
        logger.warn('Telegram pair bot disabled: invalid TELEGRAM_BOT_TOKEN format. Use full BotFather token like <bot_id>:<secret>.');
        logger.warn('Tip: you can also set TELEGRAM_BOT_ID and TELEGRAM_BOT_TOKEN (secret only), and the bot will combine them automatically.');
        return null;
    }

    let running = true;
    let offset = 0;
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
        const raw = text.replace(/^\/pair(@\w+)?/i, '').trim();
        const number = normalizeNumber(raw);
        if (!number) return sendText(chatId, '❌ Usage: /pair 2349031575131');
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
                    `🔐 Pair code for +${paired.number}:`,
                    `*${paired.code}*`,
                    '',
                    'Open WhatsApp > Linked devices > Link with phone number, then enter this code.',
                    'After success, this number gets its own saved session folder automatically.'
                ].join('\n'),
                { parse_mode: 'Markdown' }
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

    const handleUpdate = async (update) => {
        const msg = update?.message;
        const text = msg?.text || '';
        const chatId = msg?.chat?.id;
        const user = msg?.from;
        if (!chatId || !text || !user) return;

        if (/^\/start/i.test(text) || /^\/menu/i.test(text)) {
            return sendMenu(chatId, user);
        }
        if (/^\/pair\b/i.test(text)) return handlePair(chatId, user, text);
        if (/^\/delpair\b/i.test(text)) return handleDeletePair(chatId, user, text);
        if (/^\/pairs\b/i.test(text)) return handlePairs(chatId, user);
        if (/^\/listpair\b/i.test(text)) return handleListPair(chatId, user);
        if (/^\/broadcast\b/i.test(text)) return handleBroadcast(chatId, user, text);
        if (/^\/owners\b/i.test(text)) return sendText(chatId, `👑 Owners:\n${ownerNumbers.join('\n')}`);
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
