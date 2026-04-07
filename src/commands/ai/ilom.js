import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import yts from 'yt-search';
import translate from 'translate-google-api';

const STATE_FILE = path.join(process.cwd(), 'data', 'ilom-mode.json');
const GEMINI_URL = 'https://api.qasimdev.dpdns.org/api/gemini/flash';
const IMAGE_API_URL = 'https://apiskeith.top/ai/magicstudio';
const GEMINI_API_KEY = 'qasim-dev';
const ILOM_PREFIX_REGEX = /^@?ilom\b/i;

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

async function askAI(prompt) {
    const { data } = await axios.get(GEMINI_URL, {
        params: { apiKey: GEMINI_API_KEY, text: prompt }, timeout: 30000
    });
    return data?.data?.response || data?.response || data?.text || 'No response.';
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

function extractNumberFromInput(input = '') {
    return input.match(/\b\d{7,15}\b/)?.[0] || null;
}

async function fetchBufferFromUrl(url, timeout = 60000) {
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout });
    return Buffer.from(data);
}

function extractImageRef(payload) {
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    return payload.result
        || payload.url
        || payload.image
        || payload.output
        || payload?.data?.result
        || payload?.data?.url
        || payload?.data?.image
        || payload?.data?.output
        || null;
}

async function generateImageBuffer(prompt) {
    const { data } = await axios.get(IMAGE_API_URL, {
        params: { prompt },
        timeout: 60000
    });

    const ref = extractImageRef(data);
    if (typeof ref === 'string') {
        if (/^https?:\/\//i.test(ref)) {
            const img = await axios.get(ref, { responseType: 'arraybuffer', timeout: 60000 });
            return Buffer.from(img.data);
        }
        if (ref.startsWith('data:image/')) {
            const b64 = ref.split(',')[1] || '';
            if (!b64) throw new Error('Invalid base64 image payload');
            return Buffer.from(b64, 'base64');
        }
    }

    throw new Error('Image API did not return a usable image');
}

function registerReplyHandler(messageId, handler) {
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[messageId] = { command: 'ilom', handler };
    setTimeout(() => { if (global.replyHandlers?.[messageId]) delete global.replyHandlers[messageId]; }, 15 * 60 * 1000);
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
        if (!ILOM_PREFIX_REGEX.test(full)) return;

        const state = await loadState();
        const isPrivileged = isOwner || isSudo;
        const input = full.replace(ILOM_PREFIX_REGEX, '').trim();
        const recentHistory = await getRecentHistory({ from, sender });
        const userStyle = inferUserStyle(recentHistory);
        const quotedText = extractQuotedText(message);

        if (/^on$/i.test(input)) {
            if (!isPrivileged) return;
            state.public = true;
            await saveState(state);
            return await sock.sendMessage(from, { text: '✅ @ilom public mode is ON' }, { quoted: message });
        }

        if (/^off$/i.test(input)) {
            if (!isPrivileged) return;
            state.public = false;
            await saveState(state);
            return await sock.sendMessage(from, { text: '✅ @ilom public mode is OFF' }, { quoted: message });
        }

        if (!state.public && !isPrivileged) return;

        if (/\btag\b/i.test(input) && isGroup) {
            const meta = await sock.groupMetadata(from);
            const mentions = meta.participants.map((p) => p.id);
            return await sock.sendMessage(from, { text: `📢 ${input.replace(/\btag\b/i, '').trim() || 'Attention everyone!'}`, mentions }, { quoted: message });
        }

        if (/\bkick\b/i.test(input) && isGroup && isBotAdmin && isPrivileged) {
            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const rawNum = input.match(/\b\d{7,15}\b/)?.[0];
            const target = mentioned[0] || (rawNum ? `${rawNum}@s.whatsapp.net` : null);
            if (!target) return await sock.sendMessage(from, { text: 'Mention/number required for kick.' }, { quoted: message });
            await sock.groupParticipantsUpdate(from, [target], 'remove');
            return await sock.sendMessage(from, { text: `✅ Kicked @${target.split('@')[0]}`, mentions: [target] }, { quoted: message });
        }

        if (/send me\s+.+\.(js|json|txt|md|env)$/i.test(input) && isPrivileged) {
            const fileName = input.match(/send me\s+([^\s]+\.(?:js|json|txt|md|env))/i)?.[1];
            const found = await findFileByName(fileName || '');
            if (!found) return await sock.sendMessage(from, { text: '❌ File not found.' }, { quoted: message });
            return await sock.sendMessage(from, {
                document: await fs.readFile(found),
                fileName: path.basename(found),
                mimetype: 'text/plain'
            }, { quoted: message });
        }

        if (/send me (song|music)/i.test(input)) {
            const q = input.replace(/.*send me (song|music)\s*/i, '').trim();
            const video = (await yts(q)).videos?.[0];
            if (!video) return await sock.sendMessage(from, { text: '❌ Song not found.' }, { quoted: message });
            const api = `https://apiskeith.top/download/audio?url=${encodeURIComponent(video.url)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.result) throw new Error('Song API failed');
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
                return await sock.sendMessage(from, { text: '❌ Translation failed. Try again.' }, { quoted: message });
            }
            return await sock.sendMessage(from, {
                text: `🌐 *@ilom Translation*\n\n📝 Original: ${quotedText}\n\n✅ Translated (${target}): ${translated}`
            }, { quoted: message });
        }

        const aiReply = await askAI(`You are Ilom, an assistant for WhatsApp chats. User style: ${userStyle}. User: ${input || 'hello'}`);
        const sent = await sock.sendMessage(from, { text: aiReply }, { quoted: message });
        const chain = async (replyText, replyMessage) => {
            const sub = (replyText || '').trim();
            if (!sub) return;
            if (!state.public) {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                if (String(replySender).split(':')[0] !== String(sender).split(':')[0] && !isPrivileged) return;
            }
            const follow = await askAI(`Continue as Ilom. User style: ${userStyle}. User: ${sub}`);
            const s2 = await sock.sendMessage(from, { text: follow }, { quoted: replyMessage });
            registerReplyHandler(s2.key.id, chain);
        };
        registerReplyHandler(sent.key.id, chain);
    }
};
