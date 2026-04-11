import { generatePairingCode } from '../../services/pairingService.js';
import { getSessionControl, normalizePhone, updateSessionControl } from '../../utils/sessionControl.js';
import { isTopOwner } from '../../utils/privilegedUsers.js';

function normalizeDigits(input = '') {
    return String(input).replace(/\D/g, '');
}

function extractTargetNumber({ args, message, from, isGroup }) {
    const rawArgs = Array.isArray(args) ? args.join(' ') : '';
    const argValue = normalizeDigits(rawArgs);
    if (argValue) return argValue;

    const body = message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || '';
    const fromText = normalizeDigits(String(body).replace(/^\S+\s*/, ''));
    if (fromText) return fromText;

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

    async execute({ sock, message, args, from, isGroup, sender, isOwner }) {
        const senderRaw = sender || message?.key?.participant || message?.key?.remoteJid || '';
        const senderNumber = normalizePhone(senderRaw);
        if (!isOwner && (!senderNumber || !isTopOwner(senderNumber))) {
            return await sock.sendMessage(from, {
                text: '❌ Only top owners can use pair command.'
            }, { quoted: message });
        }

        const number = extractTargetNumber({ args, message, from, isGroup });

        if (!number) {
            return await sock.sendMessage(from, {
                text: [
                    '📱 *Pair your WhatsApp number*',
                    '',
                    'Send your number with this format:',
                    '• `.pair 2347046987550`',
                    '',
                    'You can also mention/reply a user and send `.pair`.',
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
            const current = await getSessionControl(sock);
            await updateSessionControl(sock, { owners: [...current.owners, number] });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

            return await sock.sendMessage(from, {
                text: [
                    `🔹 *Pair Code for +${paired.number}:*`,
                    `${paired.code}`,
                    '',
                    '*How to Link:*',
                    '1. Open WhatsApp on your phone.',
                    '2. Go to *Settings > Linked Devices*.',
                    '3. Tap *Link a Device* then choose *Link with phone number*.',
                    `4. Enter this code: *${paired.code}*`,
                    '',
                    '⏳ Code expires in about 2 minutes.'
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
