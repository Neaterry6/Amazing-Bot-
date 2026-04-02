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
    description: 'Send report to developers; dev can reply back through bot',
    usage: 'report <message>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const body = args.join(' ').trim();
        const senderNum = sender.split('@')[0];
        const sent = await sock.sendMessage(DEV, {
            text: `📩 *User Report*\nFrom: @${senderNum}\nChat: ${from}\n\n${body}`,
            mentions: [sender]
        }, { quoted: message });

        if (!global.replyHandlers) global.replyHandlers = {};
        global.replyHandlers[sent.key.id] = {
            command: 'report',
            handler: async (replyText, replyMessage) => {
                const replySender = (replyMessage.key.participant || replyMessage.key.remoteJid || '').split('@')[0];
                if (replySender !== DEV.split('@')[0]) return;
                await sock.sendMessage(from, {
                    text: `👨‍💻 *Developer Reply*\n\n${replyText}`
                });
            }
        };

        await sock.sendMessage(from, { text: '✅ Report sent to developers.' }, { quoted: message });
    }
};
