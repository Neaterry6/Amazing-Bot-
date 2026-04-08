import fs from 'fs-extra';
import path from 'path';
import logger from '../utils/logger.js';

const TELEGRAM_API = 'https://api.telegram.org';
const STORE_FILE = path.join(process.cwd(), 'data', 'telegram-pairs.json');

function nowISO() {
    return new Date().toISOString();
}

function normalizeNumber(value = '') {
    const clean = String(value || '').replace(/\D/g, '');
    if (clean.length < 10 || clean.length > 15) return null;
    return clean;
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
        '│  /delpair',
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

export async function startTelegramPairBot({
    getSock,
    ownerNumbers = [],
    token = process.env.TELEGRAM_BOT_TOKEN,
    adminIds = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map((x) => x.trim()).filter(Boolean)
} = {}) {
    if (!token) {
        logger.info('Telegram pair bot disabled (TELEGRAM_BOT_TOKEN not set)');
        return null;
    }

    let running = true;
    let offset = 0;
    const startedAt = Date.now();
    logger.info('Telegram pair bot started.');

    const runtimeText = () => {
        const sec = Math.floor((Date.now() - startedAt) / 1000);
        const min = Math.floor(sec / 60);
        const rem = sec % 60;
        return `${min}m ${rem}s`;
    };

    const sendText = async (chatId, text) => {
        await tgCall(token, 'sendMessage', { chat_id: chatId, text });
    };

    const handlePair = async (chatId, user, text) => {
        const raw = text.replace(/^\/pair(@\w+)?/i, '').trim();
        const number = normalizeNumber(raw);
        if (!number) return sendText(chatId, '❌ Usage: /pair 2349031575131');

        const sock = getSock?.();
        if (!sock || typeof sock.requestPairingCode !== 'function') {
            return sendText(chatId, '❌ WhatsApp socket not ready. Try again shortly.');
        }

        const codeRaw = await sock.requestPairingCode(number);
        const code = codeRaw?.match(/.{1,4}/g)?.join('-') || codeRaw;

        const store = await loadStore();
        store.chats = Array.from(new Set([...(store.chats || []), String(chatId)]));
        store.pairs = (store.pairs || []).filter((x) => x.tgUserId !== String(user.id));
        store.pairs.push({
            tgUserId: String(user.id),
            tgUsername: user.username || user.first_name || 'unknown',
            number,
            code,
            createdAt: nowISO(),
            status: 'code_sent'
        });
        await saveStore(store);

        return sendText(
            chatId,
            [
                `🔐 Pair code for +${number}:`,
                `*${code}*`,
                '',
                'Open WhatsApp > Linked devices > Link with phone number, then enter this code.'
            ].join('\n')
        );
    };

    const handleDeletePair = async (chatId, user) => {
        const store = await loadStore();
        const before = store.pairs?.length || 0;
        store.pairs = (store.pairs || []).filter((x) => x.tgUserId !== String(user.id));
        await saveStore(store);
        return sendText(chatId, before === store.pairs.length ? 'ℹ️ No saved pair record found.' : '✅ Pair record removed.');
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
            return sendText(chatId, buildMenu(user, runtimeText()));
        }
        if (/^\/pair\b/i.test(text)) return handlePair(chatId, user, text);
        if (/^\/delpair\b/i.test(text)) return handleDeletePair(chatId, user);
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
