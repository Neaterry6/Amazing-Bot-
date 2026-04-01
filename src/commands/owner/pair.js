export default {
    name: 'pair',
    aliases: ['paircode', 'linkuser'],
    category: 'owner',
    description: 'Generate pairing code for another number',
    usage: 'pair <countrycodenumber>',
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const number = (args[0] || '').replace(/\D/g, '');
        if (number.length < 10) {
            return await sock.sendMessage(from, { text: '❌ Invalid number. Example: pair 2349019185242' }, { quoted: message });
        }
        for (let i = 1; i <= 3; i++) {
            try {
                const rawCode = await sock.requestPairingCode(number);
                const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
                return await sock.sendMessage(from, {
                    text: `🔐 Pair code (+${number}):\n*${code}*`
                }, { quoted: message });
            } catch (error) {
                if (i === 3) {
                    return await sock.sendMessage(from, { text: `❌ Pair failed: ${error.message}` }, { quoted: message });
                }
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        const rawCode = await sock.requestPairingCode(number);
        const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
        await sock.sendMessage(from, {
            text: `🔐 Pair code for +${number}:\n*${code}*\n\nOpen WhatsApp > Linked devices > Link with phone number and input code.`
        }, { quoted: message });
    }
};
