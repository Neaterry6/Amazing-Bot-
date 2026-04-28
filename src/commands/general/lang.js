import { listSupportedLangs, resolveChatLanguage, setChatLanguage, normalizeLang } from '../../utils/languageManager.js';

function formatLangList() {
    const pairs = Object.entries(listSupportedLangs());
    return pairs.map(([code, name]) => `• ${code} - ${name}`).join('\n');
}

export default {
    name: 'lang',
    aliases: ['language', 'setlang'],
    category: 'general',
    description: 'Set chat language for bot responses',
    usage: 'lang <code> | lang list | lang reset',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, isGroup, isGroupAdmin, isOwner, isSudo, prefix }) {
        const current = await resolveChatLanguage(from);
        const input = String(args[0] || '').toLowerCase().trim();

        if (!input) {
            return sock.sendMessage(from, {
                text: [
                    '🌍 *Bot Language Settings*',
                    '',
                    `Current language: *${current}*`,
                    '',
                    `Use: ${prefix}lang <code>`,
                    `Example: ${prefix}lang fr`,
                    `Reset: ${prefix}lang reset`,
                    `List: ${prefix}lang list`,
                    '',
                    'When changed, bot text/caption replies in this chat will auto-translate.'
                ].join('\n')
            }, { quoted: message });
        }

        if (input === 'list' || input === 'all') {
            return sock.sendMessage(from, {
                text: `🌐 *Supported Languages*\n\n${formatLangList()}`
            }, { quoted: message });
        }

        if (isGroup && !(isGroupAdmin || isOwner || isSudo)) {
            return sock.sendMessage(from, {
                text: '❌ Only group admins can change group language.'
            }, { quoted: message });
        }

        const nextCode = input === 'reset' || input === 'default' ? 'en' : normalizeLang(input);
        if (!nextCode) {
            return sock.sendMessage(from, {
                text: `❌ Unsupported language code: ${input}\n\nUse ${prefix}lang list to see valid codes.`
            }, { quoted: message });
        }

        await setChatLanguage(from, nextCode);

        return sock.sendMessage(from, {
            text: [
                '✅ *Language Updated*',
                `Chat language is now: *${nextCode}*`,
                '',
                'Examples:',
                `• ${prefix}lang en (English)`,
                `• ${prefix}lang fr (French)`,
                `• ${prefix}lang es (Spanish)`
            ].join('\n')
        }, { quoted: message });
    }
};
