import { applyFont } from './fontManager.js';
import { getUserFont, getGlobalFont } from './fontStorage.js';
import { getButtonMode } from './buttonMode.js';
import { resolveChatLanguage, translateOutgoingContent } from './languageManager.js';

const NO_BUTTON_KEYS = new Set([
    'react', 'delete', 'forward', 'poll', 'location', 'contact', 'contacts',
    'product', 'order', 'groupInviteMessage', 'sticker'
]);

const TEXT_KEYS = ['text', 'caption'];

const QUICK_BUTTONS = [
    { buttonId: '.menu', buttonText: { displayText: '📋 Menu' }, type: 1 },
    { buttonId: '.help', buttonText: { displayText: '❓ Help' }, type: 1 },
    { buttonId: '.ping', buttonText: { displayText: '🏓 Ping' }, type: 1 }
];

function hasAnyKey(content, keys) {
    return keys.some((key) => Object.prototype.hasOwnProperty.call(content, key));
}

function normalizeButton(button = {}) {
    const buttonId = button.buttonId || button.id || button.nativeFlowInfo?.name || '';
    const displayText = button.buttonText?.displayText || button.text || button.displayText || '';
    if (!buttonId || !displayText) return null;

    return {
        ...button,
        buttonId,
        buttonText: { ...(button.buttonText || {}), displayText },
        type: button.type || 1
    };
}

function normalizeButtonsForBaileys(content) {
    if (!content || typeof content !== 'object' || !Array.isArray(content.buttons)) return content;

    const buttons = content.buttons
        .map(normalizeButton)
        .filter(Boolean);

    if (!buttons.length) {
        const { buttons: _buttons, ...rest } = content;
        return rest;
    }

    return {
        ...content,
        buttons,
        footer: content.footer || 'ILOM MD BOT',
        headerType: content.headerType || (content.image ? 4 : content.video ? 5 : content.document ? 3 : 1)
    };
}

function withQuickButtons(content) {
    if (!content || typeof content !== 'object') return content;
    if (content.buttons || content.listMessage || content.templateMessage || content.sections) return normalizeButtonsForBaileys(content);
    if (hasAnyKey(content, [...NO_BUTTON_KEYS])) return content;

    const hasText = typeof content.text === 'string' && content.text.trim();
    const hasCaption = typeof content.caption === 'string' && content.caption.trim();
    if (!hasText && !hasCaption) return content;

    return normalizeButtonsForBaileys({
        ...content,
        footer: content.footer || 'ILOM MD BOT',
        buttons: QUICK_BUTTONS,
        headerType: content.image ? 4 : content.video ? 5 : content.document ? 3 : 1
    });
}

function transformContent(content, font) {
    if (!content || font === 'normal') return content;

    if (typeof content === 'string') {
        return applyFont(content, font);
    }

    const result = { ...content };

    for (const key of TEXT_KEYS) {
        if (result[key] && typeof result[key] === 'string') {
            result[key] = applyFont(result[key], font);
        }
    }

    if (result.footer && typeof result.footer === 'string') {
        result.footer = applyFont(result.footer, font);
    }

    if (Array.isArray(result.buttons)) {
        result.buttons = result.buttons.map((button) => {
            const next = { ...button };
            if (typeof next.text === 'string') next.text = applyFont(next.text, font);
            if (next.buttonText?.displayText) {
                next.buttonText = { ...next.buttonText, displayText: applyFont(next.buttonText.displayText, font) };
            }
            return next;
        });
    }

    if (result.contextInfo?.externalAdReply?.title) {
        result.contextInfo = {
            ...result.contextInfo,
            externalAdReply: {
                ...result.contextInfo.externalAdReply,
                title: applyFont(result.contextInfo.externalAdReply.title, font),
                body: result.contextInfo.externalAdReply.body
                    ? applyFont(result.contextInfo.externalAdReply.body, font)
                    : undefined
            }
        };
    }

    return result;
}

export function createFontSock(sock, sender) {
    let cachedFont = null;
    let lastFetch = 0;
    const CACHE_MS = 30000;

    async function getFont() {
        const now = Date.now();
        if (cachedFont !== null && now - lastFetch < CACHE_MS) return cachedFont;

        const globalFont = await getGlobalFont();
        if (globalFont && globalFont !== 'normal') {
            cachedFont = globalFont;
            lastFetch = now;
            return cachedFont;
        }

        cachedFont = sender ? (await getUserFont(sender)) || 'normal' : 'normal';
        lastFetch = now;
        return cachedFont;
    }

    return new Proxy(sock, {
        get(target, prop) {
            if (prop === 'sendMessage') {
                return async (jid, content, options) => {
                    try {
                        const font = await getFont();
                        const buttonMode = await getButtonMode().catch(() => false);
                        const targetLang = await resolveChatLanguage(String(jid || ''));

                        let transformed = content;

                        if (buttonMode) {
                            transformed = withQuickButtons(transformed);
                        } else {
                            transformed = normalizeButtonsForBaileys(transformed);
                        }

                        transformed = await translateOutgoingContent(transformed, targetLang);
                        transformed = normalizeButtonsForBaileys(transformed);

                        if (font !== 'normal') {
                            transformed = transformContent(transformed, font);
                        }

                        if (transformed && typeof transformed === 'object') {
                            Object.defineProperty(transformed, '__skipAutoTranslate', { value: true, enumerable: false });
                        }

                        return await target.sendMessage(jid, transformed, options);
                    } catch {
                        return await target.sendMessage(jid, content, options);
                    }
                };
            }

            if (prop === '_invalidateFontCache') {
                return () => {
                    cachedFont = null;
                    lastFetch = 0;
                };
            }

            return typeof target[prop] === 'function'
                ? target[prop].bind(target)
                : target[prop];
        }
    });
}
