import { generatePairingCode } from '../../services/pairingService.js';

function normalizeDigits(input = '') {
    return String(input).replace(/\D/g, '');
}

function extractTargetNumber({ args, message, from, isGroup }) {
    const argValue = normalizeDigits(args?.[0] || '');
    if (argValue) return argValue;

    const ctx = message?.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid?.[0];
    const quotedParticipant = ctx?.participant;

    if (mentioned) return normalizeDigits(mentioned.split('@')[0]);
    if (quotedParticipant) return normalizeDigits(quotedParticipant.split('@')[0]);

    if (!isGroup && from?.endsWith('@s.whatsapp.net')) {
        return normalizeDigits(from.split('@')[0]);
    }

    return '';
}

export default {
    name: 'pair',
    aliases: ['paircode', 'linkuser', 'pairing'],
    category: 'owner',
    description: 'Generate pairing code for a WhatsApp number',
    usage: 'pair [countrycodenumber] (or mention/reply user)',
    ownerOnly: true,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, isGroup }) {
        const number = extractTargetNumber({ args, message, from, isGroup });

        if (!number) {
            return await sock.sendMessage(from, {
                text: [
                    '📱 *Pairing Code Generator*',
                    '',
                    'Send one of these:',
                    '• `pair 2349019185242`',
                    '• mention a user with `pair @user`',
                    '• reply to a user message with `pair`',
                    '',
                    'Use full country code and digits only.'
                ].join('\n')
            }, { quoted: message });
        }

        if (number.length < 10 || number.length > 15) {
            return await sock.sendMessage(from, {
                text: '❌ Invalid number format. Expected 10-15 digits, e.g. 2349019185242'
            }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

        try {
            const paired = await generatePairingCode(number);
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

            return await sock.sendMessage(from, {
                text: [
                    `🔐 *Pair code for +${paired.number}*`,
                    `*${paired.code}*`,
                    '',
                    'Open WhatsApp → Linked devices → Link with phone number, then enter this code.'
                ].join('\n')
            }, { quoted: message });
        } catch (error) {
            const lowered = String(error?.message || '').toLowerCase();
            let hint = 'Try again in a few seconds.';

            if (lowered.includes('timed out')) {
                hint = 'Network to WhatsApp was slow. Retry after 10-20 seconds.';
            } else if (lowered.includes('429') || lowered.includes('rate')) {
                hint = 'Too many attempts. Wait 1-2 minutes before trying again.';
            } else if (lowered.includes('closed')) {
                hint = 'Pairing socket closed early. Try once more.';
            }

            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return await sock.sendMessage(from, {
                text: `❌ Pair failed: ${error.message}\n💡 ${hint}`
            }, { quoted: message });
        }
    }
};
