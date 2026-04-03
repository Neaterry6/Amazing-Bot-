const DEVELOPERS = [
    '2349022424405@s.whatsapp.net',
    '2347075663318@s.whatsapp.net',
    '2349031575131@s.whatsapp.net',
    '2349019185241@s.whatsapp.net'
];

function normalizeNumber(jid = '') {
    return String(jid).replace(/[^\d]/g, '');
}

export default {
    name: 'report',
    aliases: ['bugreport', 'devreport'],
    category: 'utility',
    description: 'Send report to developers; developers can reply through the bot',
    usage: 'report <message>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const body = args.join(' ').trim();
        const senderNum = normalizeNumber(sender);

        if (!body) {
            return await sock.sendMessage(from, { text: '❌ Please include a report message.' }, { quoted: message });
        }

        if (!global.replyHandlers) global.replyHandlers = {};

        for (const devJid of DEVELOPERS) {
            const sent = await sock.sendMessage(devJid, {
                text: `📩 *User Report*\nFrom: @${senderNum}\nChat: ${from}\n\n${body}`,
                mentions: [sender]
            }, { quoted: message });

            global.replyHandlers[sent.key.id] = {
                command: 'report',
                handler: async (replyText, replyMessage) => {
                    const replySender = normalizeNumber(replyMessage.key.participant || replyMessage.key.remoteJid || '');
                    const isDeveloper = DEVELOPERS.some(dev => normalizeNumber(dev) === replySender);
                    if (!isDeveloper) return;
                    await sock.sendMessage(from, {
                        text: `👨‍💻 *Developer Reply*\n\n${replyText}`
                    });
                }
            };
        }

        await sock.sendMessage(from, {
            text: '✅ Report sent to the developer team.'
        }, { quoted: message });
    }
};
