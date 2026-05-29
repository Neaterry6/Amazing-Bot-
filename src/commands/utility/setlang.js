import { listSupportedLangs, normalizeLang, resolveChatLanguage, setChatLanguage } from '../../utils/languageManager.js';

function formatLangList() {
    return Object.entries(listSupportedLangs())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, name]) => `  • ${code} — ${name}`)
        .join('\n');
}

export default {
    name: 'setlang',
    aliases: ['setlanguage'],
    category: 'utility',
    description: 'Set the language used for all bot replies in this chat',
    usage: 'setlang <code> | setlang list | setlang reset',
    cooldown: 3,

    async execute({ sock, message, args, from, isGroup, isGroupAdmin, isOwner, isSudo, prefix }) {
        const current = await resolveChatLanguage(from);
        const input = String(args[0] || '').toLowerCase().trim();

        if (!input) {
            return sock.sendMessage(from, {
                text: `🌐 *LANGUAGE SETTINGS*\n\n📍 Current chat language: *${current}* (${listSupportedLangs()[current] || 'Custom'})\n\nUsage:\n  ${prefix}setlang fr → French\n  ${prefix}setlang reset → English\n  ${prefix}setlang list → All language codes\n\nCommon codes:\n${formatLangList()}\n\n✅ After setting this, bot text, captions, footers, buttons, and previews sent to this chat will be translated.`
            }, { quoted: message });
        }

        if (input === 'list' || input === 'all') {
            return sock.sendMessage(from, {
                text: `🌐 *SUPPORTED LANGUAGES*\n\n${formatLangList()}\n\nExample: ${prefix}setlang yo`
            }, { quoted: message });
        }

        if (isGroup && !(isGroupAdmin || isOwner || isSudo)) {
            return sock.sendMessage(from, {
                text: '❌ Only group admins can change the bot language for this group.'
            }, { quoted: message });
        }

        const nextCode = input === 'reset' || input === 'default' || input === 'en' ? 'en' : normalizeLang(input);
        if (!nextCode) {
            return sock.sendMessage(from, {
                text: `❌ Unsupported language code: *${input}*\n\nUse ${prefix}setlang list to see valid codes.`
            }, { quoted: message });
        }

        await setChatLanguage(from, nextCode);

        return sock.sendMessage(from, {
            text: [
                '✅ *Language Updated*',
                `All bot replies in this chat will now use: *${nextCode}* (${listSupportedLangs()[nextCode] || 'Custom'})`,
                '',
                `To reset: ${prefix}setlang reset`
            ].join('\n')
        }, { quoted: message });
    }
};
