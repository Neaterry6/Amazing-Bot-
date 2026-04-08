import { generatePairingCode } from '../../services/pairingService.js';

export default {
    name: 'pair',
    aliases: ['paircode', 'linkuser'],
    category: 'owner',
    description: 'Generate pairing code for another number',
    usage: 'pair [countrycodenumber]',
    ownerOnly: true,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from }) {
        const number = (args[0] || '').replace(/\D/g, '');
        if (!number) {
            return await sock.sendMessage(from, {
                text: [
                    '📱 Send a number to generate pairing code from Telegram-safe flow.',
                    '',
                    '*Example:* pair 2349019185242',
                    'Use country code and digits only.'
                ].join('\n')
            }, { quoted: message });
        }

        if (number.length < 10 || number.length > 15) {
            return await sock.sendMessage(from, {
                text: '❌ Invalid number format. Example: pair 2349019185242'
            }, { quoted: message });
        }

        try {
            const paired = await generatePairingCode(number);
            return await sock.sendMessage(from, {
                text: [
                    `🔐 Pair code (+${paired.number}):`,
                    `*${paired.code}*`,
                    '',
                    'Open WhatsApp > Linked devices > Link with phone number, then enter this code.'
                ].join('\n')
            }, { quoted: message });
        } catch (error) {
            const lowered = String(error?.message || '').toLowerCase();
            let hint = 'Try again in a few seconds.';

            if (lowered.includes('timed out')) {
                hint = 'Network to WhatsApp was slow. Retry after 10-20 seconds.';
            } else if (lowered.includes('429') || lowered.includes('rate')) {
                hint = 'Too many attempts. Wait 1-2 minutes before retrying.';
            }

            return await sock.sendMessage(from, {
                text: `❌ Pair failed: ${error.message}\n💡 ${hint}`
            }, { quoted: message });
        }
    }
};
