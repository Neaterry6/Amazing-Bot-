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
                    '📱 Send a number to generate pairing code.',
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

        for (let i = 1; i <= 3; i++) {
            try {
                const rawCode = await sock.requestPairingCode(number);
                const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
                return await sock.sendMessage(from, {
                    text: [
                        `🔐 Pair code (+${number}):`,
                        `*${code}*`,
                        '',
                        'Open WhatsApp > Linked devices > Link with phone number, then enter this code.'
                    ].join('\n')
                }, { quoted: message });
            } catch (error) {
                if (i === 3) {
                    const lowered = String(error?.message || '').toLowerCase();
                    let hint = 'Try again in a few seconds.';

                    if (lowered.includes('not connected') || lowered.includes('connection closed')) {
                        hint = 'Baileys is not connected yet. Wait for bot to fully connect, then retry.';
                    } else if (lowered.includes('429') || lowered.includes('rate')) {
                        hint = 'Too many attempts. Wait 1-2 minutes before retrying.';
                    } else if (lowered.includes('registered')) {
                        hint = 'This session is already registered. Logout/reset session before requesting a new pair code.';
                    }

                    return await sock.sendMessage(from, {
                        text: `❌ Pair failed: ${error.message}\n💡 ${hint}`
                    }, { quoted: message });
                }
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }
};
