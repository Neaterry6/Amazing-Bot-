const DEV = '23431575131@s.whatsapp.net';

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
