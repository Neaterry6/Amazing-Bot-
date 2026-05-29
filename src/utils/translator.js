import axios from 'axios';
import { resolveChatLanguage, translateOutgoingContent, translateTextIfNeeded } from './languageManager.js';

const langCache = {};

export function setUserLangCache(jid, lang) {
    if (lang && lang !== 'en') langCache[jid] = lang;
    else delete langCache[jid];
}

export function getUserLangCache(jid) {
    return langCache[jid] || null;
}

export async function translateText(text, targetLang) {
    if (!text || !targetLang || targetLang === 'en') return text;
    try {
        const { data } = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.slice(0, 4000))}`, { timeout: 10000 });
        if (data?.[0]) return data[0].map(s => s[0]).join('');
    } catch {}
    return translateTextIfNeeded(text, targetLang);
}

export function enableAutoTranslate(sock) {
    const originalSend = sock.sendMessage.bind(sock);

    sock.sendMessage = async function(jid, content, options) {
        try {
            if (content?.__skipAutoTranslate) {
                const { __skipAutoTranslate, ...cleanContent } = content;
                return originalSend(jid, cleanContent, options);
            }
            const targetJid = String(jid || '').endsWith('@g.us')
                ? jid
                : (options?.quoted?.key?.participant || jid);
            const lang = langCache[targetJid] || await resolveChatLanguage(String(targetJid || jid || ''));
            content = await translateOutgoingContent(content, lang);
        } catch {}

        return originalSend(jid, content, options);
    };

    return sock;
}
