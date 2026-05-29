import fs from 'fs-extra';
import path from 'path';
import translate from 'translate-google-api';
import { getGroup, updateGroup } from '../models/Group.js';
import { getUser, updateUser } from '../models/User.js';

const SUPPORTED_LANGS = {
    en: 'English', af: 'Afrikaans', ar: 'Arabic', zh: 'Chinese', nl: 'Dutch', fr: 'French', de: 'German',
    hi: 'Hindi', id: 'Indonesian', it: 'Italian', ja: 'Japanese', ko: 'Korean', ms: 'Malay',
    pt: 'Portuguese', ru: 'Russian', es: 'Spanish', sw: 'Swahili', th: 'Thai', tr: 'Turkish',
    ur: 'Urdu', vi: 'Vietnamese', yo: 'Yoruba', zu: 'Zulu', pl: 'Polish'
};

const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;
const LANG_STORE = path.join(process.cwd(), 'data', 'chat-languages.json');

function readLangStore() {
    try {
        if (fs.existsSync(LANG_STORE)) return fs.readJSONSync(LANG_STORE);
    } catch {}
    return {};
}

function writeLangStore(data) {
    try {
        fs.ensureDirSync(path.dirname(LANG_STORE));
        fs.writeJSONSync(LANG_STORE, data, { spaces: 2 });
    } catch {}
}

function getStoredLanguage(jid = '') {
    const data = readLangStore();
    return normalizeLang(data[jid]?.language || data[jid] || '');
}

function setStoredLanguage(jid = '', lang = 'en') {
    if (!jid) return;
    const data = readLangStore();
    if (lang === 'en') delete data[jid];
    else data[jid] = { language: lang, updatedAt: Date.now() };
    writeLangStore(data);
}

export function normalizeLang(input = '') {
    const code = String(input || '').trim().toLowerCase();
    if (!code) return 'en';
    if (SUPPORTED_LANGS[code]) return code;
    const short = code.split('-')[0];
    return SUPPORTED_LANGS[short] ? short : '';
}

export function listSupportedLangs() {
    return { ...SUPPORTED_LANGS };
}

export function isSupportedLang(code = '') {
    return !!SUPPORTED_LANGS[normalizeLang(code)];
}

export async function resolveChatLanguage(jid = '') {
    if (!jid) return 'en';

    const stored = getStoredLanguage(jid);
    if (stored) return stored;

    if (jid.endsWith('@g.us')) {
        const group = await getGroup(jid);
        return normalizeLang(group?.settings?.language || 'en') || 'en';
    }

    if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid') || jid.endsWith('@c.us')) {
        const user = await getUser(jid);
        return normalizeLang(user?.language || 'en') || 'en';
    }

    return 'en';
}

export async function setChatLanguage(jid = '', lang = 'en') {
    const normalized = normalizeLang(lang);
    if (!normalized) throw new Error('Unsupported language code.');

    setStoredLanguage(jid, normalized);

    if (jid.endsWith('@g.us')) {
        await updateGroup(jid, { $set: { 'settings.language': normalized } }).catch(() => null);
        return normalized;
    }

    await updateUser(jid, { language: normalized }).catch(() => null);
    return normalized;
}

function getCached(targetLang, text) {
    const key = `${targetLang}:${text}`;
    const item = cache.get(key);
    if (!item) return '';
    if (Date.now() - item.ts > CACHE_TTL) {
        cache.delete(key);
        return '';
    }
    return item.value;
}

function setCached(targetLang, text, value) {
    cache.set(`${targetLang}:${text}`, { value, ts: Date.now() });
}

export async function translateTextIfNeeded(text = '', targetLang = 'en') {
    const clean = String(text || '');
    const lang = normalizeLang(targetLang);
    if (!clean.trim() || !lang || lang === 'en') return clean;

    const cached = getCached(lang, clean);
    if (cached) return cached;

    try {
        const result = await translate(clean, { to: lang });
        const translated = Array.isArray(result) ? result.join('') : String(result || '').trim();
        const out = translated || clean;
        setCached(lang, clean, out);
        return out;
    } catch {
        return clean;
    }
}

async function translateButton(button, lang) {
    if (!button || typeof button !== 'object') return button;
    const next = { ...button };
    if (typeof next.text === 'string') {
        next.text = await translateTextIfNeeded(next.text, lang);
    }
    if (next.buttonText?.displayText) {
        next.buttonText = {
            ...next.buttonText,
            displayText: await translateTextIfNeeded(next.buttonText.displayText, lang)
        };
    }
    return next;
}

async function translateSections(sections, lang) {
    if (!Array.isArray(sections)) return sections;
    return Promise.all(sections.map(async (section) => ({
        ...section,
        title: typeof section.title === 'string' ? await translateTextIfNeeded(section.title, lang) : section.title,
        rows: Array.isArray(section.rows)
            ? await Promise.all(section.rows.map(async (row) => ({
                ...row,
                title: typeof row.title === 'string' ? await translateTextIfNeeded(row.title, lang) : row.title,
                description: typeof row.description === 'string' ? await translateTextIfNeeded(row.description, lang) : row.description
            })))
            : section.rows
    })));
}

export async function translateOutgoingContent(content = {}, targetLang = 'en') {
    if (!content || typeof content !== 'object') return content;
    const lang = normalizeLang(targetLang);
    if (!lang || lang === 'en') return content;

    const next = { ...content };
    if (typeof next.text === 'string') next.text = await translateTextIfNeeded(next.text, lang);
    if (typeof next.caption === 'string') next.caption = await translateTextIfNeeded(next.caption, lang);
    if (typeof next.footer === 'string') next.footer = await translateTextIfNeeded(next.footer, lang);
    if (typeof next.title === 'string') next.title = await translateTextIfNeeded(next.title, lang);
    if (typeof next.description === 'string') next.description = await translateTextIfNeeded(next.description, lang);

    if (Array.isArray(next.buttons)) {
        next.buttons = await Promise.all(next.buttons.map((button) => translateButton(button, lang)));
    }

    if (Array.isArray(next.sections)) {
        next.sections = await translateSections(next.sections, lang);
    }

    if (next.contextInfo?.externalAdReply) {
        const ad = { ...next.contextInfo.externalAdReply };
        if (typeof ad.title === 'string') ad.title = await translateTextIfNeeded(ad.title, lang);
        if (typeof ad.body === 'string') ad.body = await translateTextIfNeeded(ad.body, lang);
        next.contextInfo = { ...next.contextInfo, externalAdReply: ad };
    }

    return next;
}
