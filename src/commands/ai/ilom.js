import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import yts from 'yt-search';
import translate from 'translate-google-api';
import CryptoJS from 'crypto-js';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { cache } from '../../utils/cache.js';
import { commandManager } from '../../utils/commandManager.js';
import config from '../../config.js';
import { clearAllPairedSessions } from '../../services/pairingService.js';

const STATE_FILE = path.join(process.cwd(), 'data', 'ilom-mode.json');
const SESSION_FILE = path.join(process.cwd(), 'data', 'ilom-sessions.json');
const MEMORY_FILE = path.join(process.cwd(), 'data', 'ilom-memory.json');
const GEMINI_URLS = [
    'https://api.qasimdev.dpdns.org/api/gemini/flash',
    'https://api.qasimdev.dpdns.org/api/gemini/pro',
    'https://api.qasimdev.dpdns.org/api/gemini'
];
const IMAGE_API_URL = 'https://apiskeith.top/ai/magicstudio';
const IMAGE_FALLBACK_URL = 'https://theone-fast-image-gen.vercel.app/download-image';
const GEMINI_API_KEY = 'qasim-dev';
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const ILOM_PREFIX_REGEX = /^@?ilom\b/i;
const COMMAND_ROOT = path.join(process.cwd(), 'src', 'commands');
const VALID_CATEGORIES = ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'];
const TEMPLATE_GUIDE_FILE = path.join(process.cwd(), 'COMMAND_GUIDE.md');
const execAsync = promisify(execCb);

const LANGUAGE_ALIASES = {
    english: 'en',
    en: 'en',
    french: 'fr',
    fresh: 'fr',
    francais: 'fr',
    fr: 'fr',
    spanish: 'es',
    espanol: 'es',
    es: 'es',
    german: 'de',
    deutsch: 'de',
    de: 'de',
    portuguese: 'pt',
    portugese: 'pt',
    pt: 'pt',
    arabic: 'ar',
    ar: 'ar',
    hindi: 'hi',
    hi: 'hi',
    japanese: 'ja',
    ja: 'ja',
    korean: 'ko',
    ko: 'ko',
    chinese: 'zh-cn',
    mandarin: 'zh-cn',
    zh: 'zh-cn',
    italian: 'it',
    it: 'it',
    russian: 'ru',
    ru: 'ru'
};

async function loadState() {
    try { return await fs.readJSON(STATE_FILE); } catch { return { public: false }; }
}

async function saveState(state) {
    await fs.ensureDir(path.dirname(STATE_FILE));
    await fs.writeJSON(STATE_FILE, state, { spaces: 2 });
}

function extractText(message) {
    const m = message.message;
    return m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
}

function extractQuotedText(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return '';
    return quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || quoted.videoMessage?.caption || '';
}

function getContextInfo(message) {
    return message?.message?.extendedTextMessage?.contextInfo
        || message?.message?.imageMessage?.contextInfo
        || message?.message?.videoMessage?.contextInfo
        || message?.message?.documentMessage?.contextInfo
        || null;
}

function extractUrl(text) {
    const m = text.match(/https?:\/\/[^\s]+/i);
    return m?.[0] || null;
}

function normalizeLang(value) {
    if (!value) return 'en';
    const key = String(value).trim().toLowerCase();
    return LANGUAGE_ALIASES[key] || key;
}

function parseTranslateTarget(input = '') {
    const cleaned = input.toLowerCase();
    const hit = cleaned.match(/(?:translate(?:\s+it)?(?:\s+to)?|to)\s+([a-zA-Z-]{2,20})/i);
    return normalizeLang(hit?.[1] || 'en');
}

async function getRecentHistory({ from, sender }) {
    const fromHistory = global.messageHistory?.[from];
    if (!Array.isArray(fromHistory)) return [];
    return fromHistory
        .filter((item) => item?.sender === sender || item?.sender === String(sender).split(':')[0])
        .slice(-10)
        .map((item) => String(item?.text || '').trim())
        .filter(Boolean);
}

function toSessionId(sender = '', from = '') {
    const cleanSender = String(sender || '').split(':')[0];
    return `${from}::${cleanSender}`;
}

function jidToNumber(jid = '') {
    return String(jid || '')
        .replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '')
        .split(':')[0]
        .replace(/[^0-9]/g, '');
}

async function loadSessions() {
    try {
        const data = await fs.readJSON(SESSION_FILE);
        return data && typeof data === 'object' ? data : {};
    } catch {
        return {};
    }
}

async function saveSessions(sessions) {
    await fs.ensureDir(path.dirname(SESSION_FILE));
    await fs.writeJSON(SESSION_FILE, sessions, { spaces: 2 });
}

async function loadMemoryStore() {
    try {
        const data = await fs.readJSON(MEMORY_FILE);
        return data && typeof data === 'object' ? data : {};
    } catch {
        return {};
    }
}

async function saveMemoryStore(store) {
    await fs.ensureDir(path.dirname(MEMORY_FILE));
    await fs.writeJSON(MEMORY_FILE, store, { spaces: 2 });
}

async function getSession(sessionId) {
    const sessions = await loadSessions();
    return sessions[sessionId] || { history: [], lastBotMessageId: null, updatedAt: Date.now() };
}

async function upsertSession(sessionId, patch = {}) {
    const sessions = await loadSessions();
    const current = sessions[sessionId] || { history: [], lastBotMessageId: null };
    sessions[sessionId] = {
        ...current,
        ...patch,
        updatedAt: Date.now()
    };
    await saveSessions(sessions);
    return sessions[sessionId];
}

function inferUserStyle(history = []) {
    const sample = history.join(' ').trim();
    if (!sample) return 'casual';
    if (sample.length < 60) return 'short';
    if (sample.includes('?')) return 'curious';
    return 'casual';
}

async function findFileByName(fileName, base = process.cwd()) {
    const stack = [base];
    const deny = new Set(['node_modules', '.git', 'temp', 'logs']);
    while (stack.length) {
        const dir = stack.pop();
        const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (!deny.has(e.name)) stack.push(full);
            } else if (e.name.toLowerCase() === fileName.toLowerCase()) {
                return full;
            }
        }
    }
    return null;
}

async function listDirectorySafe(relativeInput = '.') {
    const root = process.cwd();
    const targetInput = (relativeInput || '.').trim();
    const normalized = path.normalize(targetInput);
    const resolved = path.resolve(root, normalized);

    if (!resolved.startsWith(root)) {
        throw new Error('Access denied: path is outside project root.');
    }

    const stat = await fs.stat(resolved).catch(() => null);
    if (!stat || !stat.isDirectory()) {
        throw new Error('Directory not found.');
    }

    const entries = await fs.readdir(resolved, { withFileTypes: true });
    return entries
        .filter((entry) => !entry.name.startsWith('.'))
        .sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        })
        .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? 'dir' : 'file' }));
}

function encryptTextPayload(payload, keySeed = '') {
    const secret = process.env.ILOM_FILE_SECRET || process.env.CEREBRAS_API_KEY || keySeed || 'ilom-default-secret';
    return CryptoJS.AES.encrypt(payload, secret).toString();
}

async function runLocalCommand(rawCmd = '') {
    const command = String(rawCmd || '').trim();
    if (!command) throw new Error('No command provided.');

    const blocked = ['rm -rf /', 'shutdown', 'reboot', ':(){:|:&};:', 'mkfs', 'dd if='];
    const lowered = command.toLowerCase();
    if (blocked.some((word) => lowered.includes(word))) {
        throw new Error('Blocked command for safety.');
    }

    const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 20_000,
        maxBuffer: 1024 * 1024
    });

    const out = String(stdout || '').trim();
    const err = String(stderr || '').trim();
    return { out, err };
}

async function askAI(prompt) {
    const cerebrasKey = process.env.CEREBRAS_API_KEY || process.env.CELEBRAS_API_KEY || '';
    if (cerebrasKey) {
        try {
            const { data } = await axios.post(CEREBRAS_API_URL, {
                model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
                temperature: 0.5,
                max_tokens: 700,
                messages: [
                    { role: 'system', content: 'You are Ilom, the owner assistant for this WhatsApp bot.' },
                    { role: 'user', content: prompt }
                ]
            }, {
                headers: {
                    Authorization: `Bearer ${cerebrasKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 45000
            });

            const text = data?.choices?.[0]?.message?.content?.trim();
            if (text) return text;
        } catch (error) {
            // Fallback to legacy endpoint below
        }
    }

    let lastError = null;

    for (const url of GEMINI_URLS) {
        try {
            const { data } = await axios.get(url, {
                params: { apiKey: GEMINI_API_KEY, text: prompt },
                timeout: 30000
            });
            const text = data?.data?.response || data?.response || data?.text || data?.result || '';
            if (text) return text;
        } catch (error) {
            lastError = error;
            continue;
        }
    }

    const status = lastError?.response?.status;
    if (status) {
        throw new Error(`AI service is temporarily unavailable (HTTP ${status}). Please try again in a moment.`);
    }

    throw new Error('AI service is temporarily unavailable. Please try again in a moment.');
}

function getByPath(obj, pathKey) {
    return pathKey.split('.').reduce((acc, key) => acc?.[key], obj);
}

function pickFirst(data, paths = []) {
    for (const p of paths) {
        const value = getByPath(data, p);
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
}

function extractMentionedJid(message) {
    const ctx = message?.message?.extendedTextMessage?.contextInfo;
    const mentions = ctx?.mentionedJid || [];
    return mentions[0] || null;
}

function resolveReplyOrMentionTarget(message) {
    const contextInfo = getContextInfo(message);
    const quotedUser = contextInfo?.participant;
    const mentionedUsers = contextInfo?.mentionedJid || [];

    let targetJid = null;
    if (quotedUser) {
        targetJid = quotedUser;
    } else if (mentionedUsers.length > 0) {
        targetJid = mentionedUsers[0];
    }

    return { quotedUser, mentionedUsers, targetJid };
}

function extractNumberFromInput(input = '') {
    return input.match(/\b\d{7,15}\b/)?.[0] || null;
}

async function listProjectRootEntries() {
    const root = process.cwd();
    const entries = await fs.readdir(root);
    const sorted = entries.sort((a, b) => a.localeCompare(b));
    return [
        'Here are the contents of the current directory:',
        '',
        ...sorted.map((item) => `- ${item}`),
        '',
        'How can I assist you further?'
    ].join('\n');
}

async function collectProjectFiles(dir, results = []) {
    const skip = new Set(['node_modules', '.git', 'logs', 'temp', 'cache', 'backups']);
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (skip.has(entry.name)) continue;
            await collectProjectFiles(full, results);
            continue;
        }
        if (/\.(js|mjs|cjs)$/i.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

function quoteShellPath(v = '') {
    return `'${String(v).replace(/'/g, `'\\''`)}'`;
}

async function checkProjectForSyntaxErrors() {
    const root = process.cwd();
    const files = await collectProjectFiles(root);
    const problems = [];

    for (const file of files) {
        const rel = path.relative(root, file);
        try {
            await execAsync(`node --check ${quoteShellPath(file)}`, { timeout: 15000, maxBuffer: 1024 * 512 });
        } catch (error) {
            const stderr = String(error?.stderr || error?.stdout || error?.message || '').trim();
            problems.push({
                file: rel,
                error: stderr.split('\n').slice(0, 8).join('\n') || 'Syntax check failed'
            });
        }
    }

    return { filesChecked: files.length, problems };
}

async function fetchBufferFromUrl(url, timeout = 60000) {
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout });
    return Buffer.from(data);
}

function looksLikeImageBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
    const png = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const jpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    const gif = buffer.toString('ascii', 0, 3) === 'GIF';
    return png || jpg || webp || gif;
}

function pickImageUrlFromText(text = '') {
    if (!text) return null;
    const clean = String(text).trim();
    const direct = clean.match(/https?:\/\/[^\s'"<>]+\.(?:png|jpe?g|webp|gif)(?:\?[^\s'"<>]*)?/i);
    if (direct?.[0]) return direct[0];
    const generic = clean.match(/https?:\/\/[^\s'"<>]+/i);
    return generic?.[0] || null;
}

function extractImageRef(payload) {
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    return payload.result
        || payload.url
        || payload.imageUrl
        || payload.image_url
        || payload.output_url
        || payload.image
        || payload.base64
        || payload.b64
        || payload.output
        || payload.message
        || payload.data
        || payload?.data?.result
        || payload?.data?.url
        || payload?.data?.imageUrl
        || payload?.data?.image_url
        || payload?.data?.image
        || payload?.data?.base64
        || payload?.data?.b64
        || payload?.data?.output
        || null;
}

async function generateImageBuffer(prompt) {
    const attempts = [
        async () => {
            const { data } = await axios.get(IMAGE_API_URL, {
                params: { prompt },
                timeout: 60000
            });

            const ref = extractImageRef(data);
            if (Buffer.isBuffer(ref) && looksLikeImageBuffer(ref)) return ref;
            if (typeof ref === 'string') {
                const maybeUrl = /^https?:\/\//i.test(ref) ? ref : pickImageUrlFromText(ref);
                if (maybeUrl) {
                    const img = await fetchBufferFromUrl(maybeUrl, 60000);
                    if (looksLikeImageBuffer(img)) return img;
                }

                if (ref.startsWith('data:image/')) {
                    const b64 = ref.split(',')[1] || '';
                    const image = Buffer.from(b64, 'base64');
                    if (looksLikeImageBuffer(image)) return image;
                }

                const normalized = ref.replace(/\s+/g, '');
                if (/^[A-Za-z0-9+/=]+$/.test(normalized) && normalized.length > 100) {
                    const image = Buffer.from(normalized, 'base64');
                    if (looksLikeImageBuffer(image)) return image;
                }
            }

            throw new Error('Primary image API returned non-image content');
        },
        async () => {
            const { data } = await axios.get(IMAGE_FALLBACK_URL, {
                params: {
                    prompt,
                    expires: Date.now() + 15000,
                    size: '1:1'
                },
                responseType: 'arraybuffer',
                timeout: 60000
            });

            const image = Buffer.from(data);
            if (!looksLikeImageBuffer(image)) {
                throw new Error('Fallback image API did not return image bytes');
            }
            return image;
        }
    ];

    let lastError = null;
    for (const attempt of attempts) {
        try {
            return await attempt();
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(lastError?.message || 'Image API did not return a usable image');
}

function registerReplyHandler(messageId, handler) {
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[messageId] = { command: 'ilom', handler };
    setTimeout(() => { if (global.replyHandlers?.[messageId]) delete global.replyHandlers[messageId]; }, 15 * 60 * 1000);
}

async function sendIlomMessage(sock, from, message, text, { sender, targetJid = null, forceMention = false } = {}) {
    const mentions = [];
    if (forceMention || targetJid) mentions.push(sender);
    if (targetJid) mentions.push(targetJid);
    const payload = mentions.length ? { text, mentions: [...new Set(mentions)] } : { text };
    return sock.sendMessage(from, payload, { quoted: message });
}

export default {
    name: 'ilom',
    aliases: ['ilomai', '@ilom'],
    category: 'ai',
    description: 'Special AI assistant with personal @ilom trigger and tools',
    usage: '@ilom <message>',
    noPrefix: true,

    async execute({ sock, message, args, from, sender, isGroup, isBotAdmin, isOwner, isSudo }) {
        const text = extractText(message).trim();
        const full = text || `ilom ${args.join(' ')}`;
        const contextInfo = getContextInfo(message);
        const mainOwner = config.ownerNumbers?.[0] || '';
        const isMainOwner = jidToNumber(sender) && jidToNumber(sender) === jidToNumber(mainOwner);
        const isReplyToBot = !!contextInfo?.stanzaId && !!global.replyHandlers?.[contextInfo.stanzaId];
        const shouldHandleSessionMessage = !ILOM_PREFIX_REGEX.test(full) && isReplyToBot;
        const shouldHandleOwnerNoPrefix = isMainOwner && !ILOM_PREFIX_REGEX.test(full) && !shouldHandleSessionMessage;
        if (!ILOM_PREFIX_REGEX.test(full) && !shouldHandleSessionMessage && !shouldHandleOwnerNoPrefix) return;

        const state = await loadState();
        const isPrivileged = isOwner || isSudo;
        const input = ILOM_PREFIX_REGEX.test(full) ? full.replace(ILOM_PREFIX_REGEX, '').trim() : full.trim();
        const recentHistory = await getRecentHistory({ from, sender });
        const userStyle = inferUserStyle(recentHistory);
        const quotedText = extractQuotedText(message);
        const sessionId = toSessionId(sender, from);
        const session = await getSession(sessionId);
        const { targetJid } = resolveReplyOrMentionTarget(message);

        if (!isMainOwner) return;

        if (/^on$/i.test(input)) {
            if (!isPrivileged) return;
            state.public = true;
            await saveState(state);
            return await sendIlomMessage(sock, from, message, '✅ @ilom public mode is ON', { sender, targetJid });
        }

        if (/^off$/i.test(input)) {
            if (!isPrivileged) return;
            state.public = false;
            await saveState(state);
            return await sendIlomMessage(sock, from, message, '✅ @ilom public mode is OFF', { sender, targetJid });
        }

        if (!state.public && !isPrivileged) return;

        if (/^(assistant|ilom assistant|open assistant|show assistant|list files|show files|current directory|ls)$/i.test(input)) {
            const listing = await listProjectRootEntries();
            return await sendIlomMessage(sock, from, message, listing, { sender, targetJid });
        }

        if (/^(reload all commands|reload commands|refresh commands)$/i.test(input) && isPrivileged) {
            try {
                await commandManager.reloadAllCommands();
                return await sendIlomMessage(sock, from, message, '✅ All commands reloaded successfully.', { sender, targetJid });
            } catch (error) {
                return await sendIlomMessage(sock, from, message, `❌ Failed to reload commands: ${error.message}`, { sender, targetJid });
            }
        }

        if (/^(clear sessions|clear paired sessions|wipe sessions)$/i.test(input) && isPrivileged) {
            try {
                await clearAllPairedSessions();
                return await sendIlomMessage(sock, from, message, '✅ All paired sessions cleared.', { sender, targetJid });
            } catch (error) {
                return await sendIlomMessage(sock, from, message, `❌ Failed to clear sessions: ${error.message}`, { sender, targetJid });
            }
        }

        if (/^(check bot errors|check errors|scan bot|scan project|find errors|diagnose bot)$/i.test(input) && isPrivileged) {
            const result = await checkProjectForSyntaxErrors();
            if (!result.problems.length) {
                return await sendIlomMessage(
                    sock,
                    from,
                    message,
                    `✅ No syntax errors found.\nFiles checked: ${result.filesChecked}`,
                    { sender, targetJid }
                );
            }
            const preview = result.problems
                .slice(0, 8)
                .map((p, i) => `${i + 1}. ${p.file}\n${p.error}`)
                .join('\n\n');
            return await sendIlomMessage(
                sock,
                from,
                message,
                `❌ Found ${result.problems.length} file(s) with syntax errors.\nFiles checked: ${result.filesChecked}\n\n${preview}`,
                { sender, targetJid }
            );
        }

        if (/^(fix bot errors|fix errors|auto fix errors)$/i.test(input) && isPrivileged) {
            const before = await checkProjectForSyntaxErrors();
            if (!before.problems.length) {
                return await sendIlomMessage(sock, from, message, `✅ No syntax errors to fix. Files checked: ${before.filesChecked}`, { sender, targetJid });
            }

            const fix = await runLocalCommand('npm run lint -- --fix || npm run lint --fix || true');
            const after = await checkProjectForSyntaxErrors();

            if (!after.problems.length) {
                await commandManager.reloadAllCommands().catch(() => {});
                return await sendIlomMessage(
                    sock,
                    from,
                    message,
                    `✅ Errors fixed automatically.\nBefore: ${before.problems.length}\nAfter: 0\n\n${(fix.out || fix.err || '').slice(0, 1200) || 'Auto-fix completed.'}`,
                    { sender, targetJid }
                );
            }

            const remaining = after.problems.slice(0, 6).map((p) => `• ${p.file}`).join('\n');
            return await sendIlomMessage(
                sock,
                from,
                message,
                `⚠️ Auto-fix attempted.\nBefore: ${before.problems.length}\nAfter: ${after.problems.length}\nRemaining files:\n${remaining}\n\n${(fix.err || fix.out || '').slice(0, 1200)}`,
                { sender, targetJid }
            );
        }

        if (/^(memory|memories|show memory|show memories)$/i.test(input)) {
            const store = await loadMemoryStore();
            const ownerKey = jidToNumber(sender);
            const userMem = store[ownerKey] || {};
            const keys = Object.keys(userMem);
            if (!keys.length) {
                return await sendIlomMessage(sock, from, message, '🧠 No saved memories yet. Use: "remember <key> = <value>".', { sender, targetJid });
            }
            const lines = keys.slice(0, 30).map((k) => `• ${k}: ${String(userMem[k]).slice(0, 120)}`);
            return await sendIlomMessage(sock, from, message, `🧠 Saved memories:\n${lines.join('\n')}`, { sender, targetJid });
        }

        if (/^(remember|save memory)\s+/i.test(input)) {
            const payload = input.replace(/^(remember|save memory)\s+/i, '').trim();
            const m = payload.match(/^([a-zA-Z0-9_.-]{2,60})\s*(?:=|:)\s*([\s\S]{1,800})$/);
            if (!m) {
                return await sendIlomMessage(sock, from, message, '❌ Usage: remember <key> = <value>', { sender, targetJid });
            }
            const [, key, value] = m;
            const store = await loadMemoryStore();
            const ownerKey = jidToNumber(sender);
            if (!store[ownerKey]) store[ownerKey] = {};
            store[ownerKey][key.toLowerCase()] = value.trim();
            await saveMemoryStore(store);
            return await sendIlomMessage(sock, from, message, `✅ Memory saved: ${key.toLowerCase()}`, { sender, targetJid });
        }

        if (/^(forget|delete memory)\s+/i.test(input)) {
            const key = input.replace(/^(forget|delete memory)\s+/i, '').trim().toLowerCase();
            const store = await loadMemoryStore();
            const ownerKey = jidToNumber(sender);
            if (!store[ownerKey]?.[key]) {
                return await sendIlomMessage(sock, from, message, `ℹ️ Memory not found: ${key}`, { sender, targetJid });
            }
            delete store[ownerKey][key];
            await saveMemoryStore(store);
            return await sendIlomMessage(sock, from, message, `🗑️ Memory deleted: ${key}`, { sender, targetJid });
        }

        if (/^recall\s+/i.test(input)) {
            const key = input.replace(/^recall\s+/i, '').trim().toLowerCase();
            const store = await loadMemoryStore();
            const ownerKey = jidToNumber(sender);
            const value = store[ownerKey]?.[key];
            if (!value) {
                return await sendIlomMessage(sock, from, message, `ℹ️ I don't remember "${key}" yet.`, { sender, targetJid });
            }
            return await sendIlomMessage(sock, from, message, `🧠 ${key}: ${value}`, { sender, targetJid });
        }

        if (/\btag\b/i.test(input) && isGroup) {
            const meta = await sock.groupMetadata(from);
            const mentions = meta.participants.map((p) => p.id);
            return await sock.sendMessage(from, { text: `📢 ${input.replace(/\btag\b/i, '').trim() || 'Attention everyone!'}`, mentions }, { quoted: message });
        }

        if (/^kick\b/i.test(input) && isGroup && isBotAdmin && isPrivileged) {
            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const rawNum = input.match(/\b\d{7,15}\b/)?.[0];
            const target = mentioned[0] || (rawNum ? `${rawNum}@s.whatsapp.net` : null);
            if (!target) return await sock.sendMessage(from, { text: 'Mention/number required for kick.' }, { quoted: message });
            await sock.groupParticipantsUpdate(from, [target], 'remove');
            return await sock.sendMessage(from, { text: `✅ Kicked @${target.split('@')[0]}`, mentions: [target] }, { quoted: message });
        }

        if (/send me (file|my file)|send me\s+.+\.(js|json|txt|md|env)$/i.test(input) && isPrivileged) {
            const fileName = input.match(/send me(?:\s+file)?\s+([^\s]+\.(?:js|json|txt|md|env))/i)?.[1];
            const found = await findFileByName(fileName || '');
            if (!found) return await sendIlomMessage(sock, from, message, '❌ File not found.', { sender, targetJid });

            const shouldEncrypt = /\bencrypt(ed)?\b|\bencrypt before sending\b/i.test(input);
            const fileBuffer = await fs.readFile(found);

            if (shouldEncrypt) {
                const encrypted = encryptTextPayload(fileBuffer.toString('base64'), sender);
                const encryptedBuffer = Buffer.from(encrypted, 'utf8');
                return await sock.sendMessage(from, {
                    document: encryptedBuffer,
                    fileName: `${path.basename(found)}.enc.txt`,
                    mimetype: 'text/plain',
                    caption: '🔐 Encrypted file'
                }, { quoted: message });
            }

            return await sock.sendMessage(from, {
                document: fileBuffer,
                fileName: path.basename(found),
                mimetype: 'text/plain'
            }, { quoted: message });
        }

        if (/template guide|command template|how to create command/i.test(input)) {
            const guideExists = await fs.pathExists(TEMPLATE_GUIDE_FILE);
            if (!guideExists) {
                return await sendIlomMessage(sock, from, message, '❌ Template guide file not found.', { sender, targetJid });
            }
            const guide = await fs.readFile(TEMPLATE_GUIDE_FILE, 'utf8');
            const preview = guide.slice(0, 3500);
            return await sendIlomMessage(
                sock,
                from,
                message,
                `📚 Command Template Guide loaded.\n\n${preview}\n\n(Reply: "ilom send full template guide" to get full file)`,
                { sender, targetJid }
            );
        }

        if (/send full template guide/i.test(input)) {
            const guideExists = await fs.pathExists(TEMPLATE_GUIDE_FILE);
            if (!guideExists) return await sendIlomMessage(sock, from, message, '❌ Template guide file not found.', { sender, targetJid });
            return await sock.sendMessage(from, {
                document: await fs.readFile(TEMPLATE_GUIDE_FILE),
                fileName: 'COMMAND_GUIDE.md',
                mimetype: 'text/markdown'
            }, { quoted: message });
        }

        if (/list (all )?commands|show command list|help command/i.test(input)) {
            const catalog = await listAllCommands();
            const lines = Object.entries(catalog)
                .map(([cat, files]) => `• ${cat} (${files.length}): ${files.slice(0, 10).map((f) => f.replace('.js', '')).join(', ') || 'none'}`)
                .join('\n');
            return await sendIlomMessage(sock, from, message, `🧩 Bot Command Index\n\n${lines}`, { sender, targetJid });
        }

        if (/^ls(?:\s+.+)?$/i.test(input)) {
            const dirArg = input.replace(/^ls/i, '').trim() || '.';
            try {
                const entries = await listDirectorySafe(dirArg);
                if (!entries.length) {
                    return await sendIlomMessage(sock, from, message, '📂 Directory is empty.', { sender, targetJid });
                }

                const relDir = dirArg === '.' ? '.' : dirArg;
                const rendered = entries
                    .slice(0, 120)
                    .map((entry) => `- ${entry.type === 'dir' ? '📁' : '📄'} ${entry.name}`)
                    .join('\n');
                const truncated = entries.length > 120 ? `\n\n…and ${entries.length - 120} more entries.` : '';
                return await sendIlomMessage(
                    sock,
                    from,
                    message,
                    `Here are the contents of \`${relDir}\`:\n\n${rendered}${truncated}`,
                    { sender, targetJid }
                );
            } catch (error) {
                return await sendIlomMessage(sock, from, message, `❌ ls failed: ${error.message}`, { sender, targetJid });
            }
        }

        if (/^clear cache$/i.test(input)) {
            try {
                const [cacheCleared] = await Promise.allSettled([
                    cache.flush(),
                    commandManager.initializeCommands()
                ]);

                if (global.replyHandlers && typeof global.replyHandlers === 'object') {
                    global.replyHandlers = {};
                }

                if (cacheCleared.status === 'rejected') {
                    throw cacheCleared.reason;
                }

                return await sendIlomMessage(
                    sock,
                    from,
                    message,
                    '✅ Cache cleared and command registry refreshed.\nIf you need a full process reboot, run the `restart` owner command.',
                    { sender, targetJid }
                );
            } catch (error) {
                return await sendIlomMessage(sock, from, message, `❌ Clear cache failed: ${error.message}`, { sender, targetJid });
            }
        }

        if (/create command(?! like)/i.test(input) && isPrivileged) {
            const parsed = input.match(/create command\s+([a-z]+)\s+([a-z0-9_-]+)(?:\s*[:|-]\s*(.+))?/i);
            if (!parsed) {
                return await sendIlomMessage(sock, from, message, '❌ Usage: ilom create command <category> <name> : <description>', { sender, targetJid });
            }
            const category = parsed[1].toLowerCase();
            const name = parsed[2].toLowerCase();
            const description = parsed[3]?.trim() || 'Generated command template';
            if (!VALID_CATEGORIES.includes(category)) {
                return await sendIlomMessage(sock, from, message, `❌ Invalid category. Use: ${VALID_CATEGORIES.join(', ')}`, { sender, targetJid });
            }
            const filePath = sanitizeCommandPath(path.join(category, `${name}.js`));
            if (!filePath) return await sendIlomMessage(sock, from, message, '❌ Invalid command path.', { sender, targetJid });
            const code = buildCommandTemplate({ category, name, description });
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, code, 'utf8');
            await commandManager.reloadAllCommands();
            return await sendIlomMessage(sock, from, message, `✅ Command created: src/commands/${category}/${name}.js`, { sender, targetJid });
        }

        if (/^(create|build|generate)\s+command\s+(?:from\s+)?description/i.test(input) && isPrivileged) {
            const parsed = input.match(/(?:create|build|generate)\s+command\s+(?:from\s+)?description\s+([a-z]+)\s+([a-z0-9_-]+)\s*[:|-]\s*(.+)$/i);
            if (!parsed) {
                return await sendIlomMessage(sock, from, message, '❌ Usage: ilom create command from description <category> <name> : <what it should do>', { sender, targetJid });
            }

            const category = parsed[1].toLowerCase();
            const name = parsed[2].toLowerCase();
            const description = parsed[3].trim();

            if (!VALID_CATEGORIES.includes(category)) {
                return await sendIlomMessage(sock, from, message, `❌ Invalid category. Use: ${VALID_CATEGORIES.join(', ')}`, { sender, targetJid });
            }

            const filePath = sanitizeCommandPath(path.join(category, `${name}.js`));
            if (!filePath) return await sendIlomMessage(sock, from, message, '❌ Invalid command path.', { sender, targetJid });

            const prompt = [
                'Generate a WhatsApp bot command file in JavaScript.',
                'Must use default export object: { name, aliases, category, description, usage, async execute(...) }.',
                `Command category: ${category}`,
                `Command name: ${name}`,
                `Behavior description: ${description}`,
                'Return only raw JS code.'
            ].join('\n');

            let generated = await askAI(prompt);
            if (!/export\s+default/.test(generated)) {
                generated = buildCommandTemplate({ category, name, description });
            }

            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, generated.trim(), 'utf8');
            await commandManager.reloadAllCommands();
            return await sendIlomMessage(sock, from, message, `✅ Generated and saved: src/commands/${category}/${name}.js`, { sender, targetJid });
        }

        if (/create (this|that|same) command|create command like/i.test(input) && isPrivileged) {
            const parsed = input.match(/(?:create (?:this|that|same) command|create command like(?: this)?)\s+([a-z]+)\s+([a-z0-9_-]+)(?:\s*[:|-]\s*(.+))?/i);
            if (!parsed) {
                return await sendIlomMessage(sock, from, message, '❌ Usage: reply with command code, then: ilom create command like <category> <name> : <description>', { sender, targetJid });
            }
            const category = parsed[1].toLowerCase();
            const name = parsed[2].toLowerCase();
            const description = parsed[3]?.trim() || '';
            if (!VALID_CATEGORIES.includes(category)) {
                return await sendIlomMessage(sock, from, message, `❌ Invalid category. Use: ${VALID_CATEGORIES.join(', ')}`, { sender, targetJid });
            }
            const source = extractQuotedText(message);
            if (!source || !/export\s+default/.test(source)) {
                return await sendIlomMessage(sock, from, message, '❌ Reply to a command source snippet that contains export default.', { sender, targetJid });
            }
            const remapped = adaptCommandSource(source, { category, name, description });
            if (!remapped) {
                return await sendIlomMessage(sock, from, message, '❌ Could not adapt that source. Reply with full command code.', { sender, targetJid });
            }
            const filePath = sanitizeCommandPath(path.join(category, `${name}.js`));
            if (!filePath) return await sendIlomMessage(sock, from, message, '❌ Invalid command path.', { sender, targetJid });
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, remapped, 'utf8');
            await commandManager.reloadAllCommands();
            return await sendIlomMessage(sock, from, message, `✅ Command cloned from your reply: src/commands/${category}/${name}.js`, { sender, targetJid });
        }

        if (/install command from/i.test(input) && isPrivileged) {
            const match = input.match(/install command from\s+(https?:\/\/\S+)\s+to\s+([a-z]+)/i);
            if (!match) {
                return await sendIlomMessage(sock, from, message, '❌ Usage: ilom install command from <url> to <category>', { sender, targetJid });
            }
            const [, url, categoryRaw] = match;
            const category = categoryRaw.toLowerCase();
            if (!VALID_CATEGORIES.includes(category)) {
                return await sendIlomMessage(sock, from, message, `❌ Invalid category. Use: ${VALID_CATEGORIES.join(', ')}`, { sender, targetJid });
            }
            const { data } = await axios.get(url, { timeout: 45000 });
            const code = String(data || '');
            const commandName = code.match(/name:\s*['"`]([a-z0-9_-]+)['"`]/i)?.[1] || `installed_${Date.now()}`;
            const filePath = sanitizeCommandPath(path.join(category, `${commandName}.js`));
            if (!filePath) return await sendIlomMessage(sock, from, message, '❌ Invalid install path.', { sender, targetJid });
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, code, 'utf8');
            await commandManager.reloadAllCommands();
            return await sendIlomMessage(sock, from, message, `✅ Installed command: src/commands/${category}/${commandName}.js`, { sender, targetJid });
        }

        if (/delete (file|command)/i.test(input) && isPrivileged) {
            const targetPath = input.replace(/.*delete (?:file|command)\s+/i, '').trim();
            if (!targetPath) return await sendIlomMessage(sock, from, message, '❌ Provide file path to delete.', { sender, targetJid });
            const resolved = targetPath.includes('src/commands')
                ? sanitizeRelativePath(targetPath)
                : sanitizeCommandPath(targetPath);
            if (!resolved || !(await fs.pathExists(resolved))) {
                return await sendIlomMessage(sock, from, message, '❌ File not found for deletion.', { sender, targetJid });
            }
            await fs.remove(resolved);
            await commandManager.reloadAllCommands();
            return await sendIlomMessage(sock, from, message, `🗑️ Deleted: ${path.relative(process.cwd(), resolved)}`, { sender, targetJid });
        }

        if (/^(cmd|run|terminal)\b/i.test(input) && isPrivileged) {
            const rawCmd = input.replace(/^(cmd|run|terminal)\b/i, '').trim();
            if (!rawCmd) {
                return await sendIlomMessage(sock, from, message, '❌ Usage: ilom cmd <shell command>', { sender, targetJid });
            }
            try {
                const result = await runLocalCommand(rawCmd);
                const output = [`💻 Command: ${rawCmd}`];
                if (result.out) output.push(`\n📤 stdout:\n${result.out.slice(0, 3500)}`);
                if (result.err) output.push(`\n⚠️ stderr:\n${result.err.slice(0, 1200)}`);
                if (!result.out && !result.err) output.push('\n✅ Done (no output).');
                return await sendIlomMessage(sock, from, message, output.join('\n'), { sender, targetJid });
            } catch (error) {
                return await sendIlomMessage(sock, from, message, `❌ Command failed: ${error.message}`, { sender, targetJid });
            }
        }

        if (/send me (song|music)/i.test(input)) {
            const q = input.replace(/.*send me (song|music)\s*/i, '').trim();
            if (!q) {
                return await sock.sendMessage(from, {
                    text: '❌ Tell me the song name, for example: "@ilom send me song blinding lights"'
                }, { quoted: message });
            }
            const video = (await yts(q)).videos?.[0];
            if (!video) return await sock.sendMessage(from, { text: '❌ Song not found.' }, { quoted: message });
            const api = `https://apiskeith.top/download/audio?url=${encodeURIComponent(video.url)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.result) throw new Error('Song API failed');
            const details = [
                '🎵 *Song details*',
                `• Title: ${video.title || 'Unknown'}`,
                `• Channel: ${video.author?.name || 'Unknown'}`,
                `• Duration: ${video.timestamp || 'Unknown'}`,
                `• Views: ${Number(video.views || 0).toLocaleString()}`,
                `• Link: ${video.url}`
            ].join('\n');

            await sock.sendMessage(from, { text: details }, { quoted: message });
            return await sock.sendMessage(from, { audio: { url: data.result }, mimetype: 'audio/mpeg' }, { quoted: message });
        }

        if (/send me image|image of|generate image/i.test(input)) {
            const q = input.replace(/.*(?:image of|send me image of|send me image|generate image of?)\s*/i, '').trim() || 'random';
            const imageBuffer = await generateImageBuffer(q);
            return await sock.sendMessage(from, { image: imageBuffer, caption: `🖼️ ${q}` }, { quoted: message });
        }

        if (/shorten\s*url|shortenurl|tinyurl/i.test(input)) {
            const rawUrl = extractUrl(input);
            if (!rawUrl) return await sock.sendMessage(from, { text: '❌ Send a URL to shorten.' }, { quoted: message });
            const { data } = await axios.get('https://apiskeith.top/shortener/tinyurl', {
                params: { url: rawUrl }, timeout: 30000
            });
            const shortUrl = pickFirst(data, ['result', 'url', 'data.result', 'data.url']) || String(data);
            return await sock.sendMessage(from, { text: `🔗 Short URL:\n${shortUrl}` }, { quoted: message });
        }

        if (/get .*dp|user dp|profile picture|profile dp/i.test(input)) {
            const tagged = extractMentionedJid(message);
            const fallback = extractNumberFromInput(input);
            const number = (tagged ? tagged.split('@')[0] : fallback)?.replace(/\D/g, '');
            if (!number) {
                return await sock.sendMessage(from, { text: '❌ Tag a user or provide a number.' }, { quoted: message });
            }
            const { data } = await axios.get('https://apiskeith.top/whatsapp/profile', {
                params: { query: number }, timeout: 30000
            });
            const dpUrl = pickFirst(data, ['result', 'url', 'data.result', 'data.url', 'profile']);
            if (!dpUrl || !/^https?:\/\//i.test(String(dpUrl))) {
                return await sock.sendMessage(from, { text: '❌ Could not fetch profile picture.' }, { quoted: message });
            }
            const buffer = await fetchBufferFromUrl(String(dpUrl), 60000);
            return await sock.sendMessage(from, {
                image: buffer,
                caption: `👤 Profile picture for ${number}`
            }, { quoted: message });
        }

        if (/encrypt .*javascript|encrypt .*js|encrypt code/i.test(input)) {
            const code = input
                .replace(/.*(?:encrypt .*javascript|encrypt .*js|encrypt code)\s*/i, '')
                .trim();
            if (!code) return await sock.sendMessage(from, { text: '❌ Provide JavaScript code to encrypt.' }, { quoted: message });
            const { data } = await axios.get('https://apiskeith.top/tools/encrypt2', {
                params: { q: code }, timeout: 45000
            });
            const encrypted = pickFirst(data, ['result', 'data.result', 'encrypted', 'data.encrypted']) || String(data);
            return await sock.sendMessage(from, { text: `🔐 Encrypted JS:\n${encrypted}` }, { quoted: message });
        }

        if (/create .*whats(app)? link|wa link|walink/i.test(input)) {
            const tagged = extractMentionedJid(message);
            const fallback = extractNumberFromInput(input);
            const number = (tagged ? tagged.split('@')[0] : fallback)?.replace(/\D/g, '');
            const msg = input.match(/(?:q=|message|text)\s+(.+)/i)?.[1] || 'hi';
            if (!number) return await sock.sendMessage(from, { text: '❌ Tag a user or include a number.' }, { quoted: message });
            const { data } = await axios.get('https://apiskeith.top/tools/walink', {
                params: { q: msg, number }, timeout: 30000
            });
            const waLink = pickFirst(data, ['result', 'url', 'data.result', 'data.url']) || String(data);
            return await sock.sendMessage(from, { text: `📲 WhatsApp link:\n${waLink}` }, { quoted: message });
        }

        if (/random hentai video|send me .*hentai/i.test(input)) {
            const { data } = await axios.get('https://apiskeith.top/dl/hentaivid', { timeout: 45000 });
            const videoUrl = pickFirst(data, ['result', 'url', 'data.result', 'data.url', 'video']);
            if (!videoUrl || !/^https?:\/\//i.test(String(videoUrl))) {
                return await sock.sendMessage(from, { text: '❌ Failed to fetch hentai video.' }, { quoted: message });
            }
            const videoBuffer = await fetchBufferFromUrl(String(videoUrl), 120000);
            return await sock.sendMessage(from, { video: videoBuffer, mimetype: 'video/mp4', caption: '🔞 Random hentai video' }, { quoted: message });
        }

        if (/download .*youtube|youtube video|yt video/i.test(input)) {
            const yUrl = extractUrl(input);
            if (!yUrl) return await sock.sendMessage(from, { text: '❌ Send a valid YouTube URL.' }, { quoted: message });
            const { data } = await axios.get('https://apiskeith.top/download/video', {
                params: { url: yUrl }, timeout: 60000
            });
            const videoUrl = pickFirst(data, ['result', 'url', 'data.result', 'data.url', 'download']);
            if (!videoUrl || !/^https?:\/\//i.test(String(videoUrl))) {
                return await sock.sendMessage(from, { text: '❌ Failed to download YouTube video.' }, { quoted: message });
            }
            const videoBuffer = await fetchBufferFromUrl(String(videoUrl), 180000);
            return await sock.sendMessage(from, { video: videoBuffer, mimetype: 'video/mp4', caption: '✅ YouTube video downloaded' }, { quoted: message });
        }

        if (/(latest|trending).*(movie|movies)|(movie|movies).*(latest|trending)/i.test(input)) {
            const { data } = await axios.get('https://apiskeith.top/dramabox/home', { timeout: 45000 });
            const list = pickFirst(data, ['result', 'data.result', 'movies', 'data.movies']);
            const items = Array.isArray(list) ? list.slice(0, 10) : [];
            if (!items.length) {
                return await sock.sendMessage(from, { text: `🎬 Latest/Trending:\n${JSON.stringify(data).slice(0, 800)}` }, { quoted: message });
            }
            const textOut = items.map((m, i) => `*${i + 1}.* ${m.title || m.name || 'Untitled'}`).join('\n');
            return await sock.sendMessage(from, { text: `🎬 Latest & Trending Movies:\n\n${textOut}` }, { quoted: message });
        }

        if (/search movie|find movie/i.test(input)) {
            const q = input.replace(/.*(?:search movie|find movie)\s*/i, '').trim();
            if (!q) return await sock.sendMessage(from, { text: '❌ Provide movie title to search.' }, { quoted: message });
            const { data } = await axios.get('https://apiskeith.top/moviebox/search', {
                params: { q }, timeout: 45000
            });
            const list = pickFirst(data, ['result', 'data.result', 'movies', 'data.movies']);
            const items = Array.isArray(list) ? list.slice(0, 10) : [];
            if (!items.length) {
                return await sock.sendMessage(from, { text: `🔎 No movie result for "${q}".` }, { quoted: message });
            }
            const textOut = items.map((m, i) => `*${i + 1}.* ${m.title || m.name || 'Untitled'}`).join('\n');
            return await sock.sendMessage(from, { text: `🎬 Search results for "${q}":\n\n${textOut}` }, { quoted: message });
        }

        if (/endpoint|html|stalk.*website/i.test(input)) {
            const url = extractUrl(input);
            if (!url) return await sock.sendMessage(from, { text: '❌ Provide a valid URL.' }, { quoted: message });
            const { data } = await axios.get(url, { timeout: 20000 });
            const html = String(data);
            const endpoints = [...new Set([...(html.match(/href=["']([^"'#?]+)["']/gi) || []).map((x) => x.replace(/href=["']|["']/gi, '')), ...(html.match(/src=["']([^"'#?]+)["']/gi) || []).map((x) => x.replace(/src=["']|["']/gi, ''))])].filter(Boolean).slice(0, 40);
            return await sock.sendMessage(from, { text: `🌐 HTML fetched (${html.length} chars)\n\nEndpoints:\n${endpoints.map((e) => `• ${e}`).join('\n') || 'None found'}` }, { quoted: message });
        }

        if (quotedText && /\btranslate\b/i.test(input)) {
            const target = parseTranslateTarget(input);
            const result = await translate(quotedText, { to: target });
            const translated = Array.isArray(result) ? result.join('') : String(result || '').trim();
            if (!translated) {
                return await sendIlomMessage(sock, from, message, '❌ Translation failed. Try again.', { sender, targetJid });
            }
            return await sendIlomMessage(
                sock,
                from,
                message,
                `🌐 *@ilom Translation*\n\n📝 Original: ${quotedText}\n\n✅ Translated (${target}): ${translated}`,
                { sender, targetJid, forceMention: !!targetJid }
            );
        }

        try {
            const history = Array.isArray(session.history) ? session.history.slice(-12) : [];
            const memoryStore = await loadMemoryStore();
            const personalMemory = memoryStore[jidToNumber(sender)] || {};
            const memoryText = Object.keys(personalMemory)
                .slice(0, 30)
                .map((k) => `${k}: ${personalMemory[k]}`)
                .join('\n');
            const prompt = [
                'You are Ilom, an assistant for WhatsApp chats.',
                `User style: ${userStyle}.`,
                memoryText ? `Saved memories:\n${memoryText}` : '',
                history.length ? `Recent chat history:\n${history.join('\n')}` : '',
                `User: ${input || 'hello'}`
            ].filter(Boolean).join('\n');
            const aiReply = await askAI(prompt);
            const sent = await sendIlomMessage(sock, from, message, aiReply, { sender, targetJid, forceMention: !!targetJid });
            const nextHistory = [...history, `User: ${input || 'hello'}`, `Ilom: ${aiReply}`].slice(-20);
            await upsertSession(sessionId, { history: nextHistory, lastBotMessageId: sent?.key?.id || null, user: sender });
            const chain = async (replyText, replyMessage) => {
                const sub = (replyText || '').trim();
                if (!sub) return;
                if (!state.public) {
                    const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                    if (String(replySender).split(':')[0] !== String(sender).split(':')[0] && !isPrivileged) return;
                }
                try {
                    const liveSession = await getSession(sessionId);
                    const liveHistory = Array.isArray(liveSession.history) ? liveSession.history.slice(-12) : [];
                    const followPrompt = [
                        'Continue as Ilom in the same conversation.',
                        `User style: ${userStyle}.`,
                        liveHistory.length ? `Recent chat history:\n${liveHistory.join('\n')}` : '',
                        `User: ${sub}`
                    ].filter(Boolean).join('\n');
                    const follow = await askAI(followPrompt);
                    const s2 = await sendIlomMessage(sock, from, replyMessage, follow, { sender, targetJid, forceMention: !!targetJid });
                    const mergedHistory = [...liveHistory, `User: ${sub}`, `Ilom: ${follow}`].slice(-20);
                    await upsertSession(sessionId, { history: mergedHistory, lastBotMessageId: s2?.key?.id || null, user: sender });
                    registerReplyHandler(s2.key.id, chain);
                } catch (err) {
                    await sendIlomMessage(sock, from, replyMessage, `❌ Error: ${err.message || 'Could not get AI response right now.'}`, { sender, targetJid });
                }
            };
            registerReplyHandler(sent.key.id, chain);
        } catch (err) {
            return await sendIlomMessage(sock, from, message, `❌ Error: ${err.message || 'Could not get AI response right now.'}`, { sender, targetJid });
        }
    }
};
