export default {
    name: 'jid',
    aliases: ['lid', 'uid'],
    category: 'utility',
    description: 'Get JID, LID/UID, pushname, mentions and profile status',
    usage: 'jid (reply/tag optional)',
    cooldown: 5,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, from }) {
        const context = message.message?.extendedTextMessage?.contextInfo || {};
        const sender = message.key.participant || message.key.remoteJid || from;
        const mentioned = context.mentionedJid || [];
        const quotedParticipant = context.participant || null;

        let text = '';
        if (from.endsWith('@g.us')) text += `📍 *Group JID:* ${from}\n`;
        text += `👤 *Your JID:* ${sender}\n`;
        text += `🔢 *LID/UID:* ${String(sender).split('@')[0]}\n`;
        text += `📛 *Pushname:* ${message.pushName || 'N/A'}\n`;

        mentioned.forEach((jid, i) => {
            text += `🔖 *Tagged ${i + 1}:* ${jid}\n`;
        });

        if (quotedParticipant) {
            text += `💬 *Replied User:* ${quotedParticipant}\n`;
        }

        try {
            const status = await sock.fetchStatus(sender);
            text += `📝 *Status:* ${status?.status || 'N/A'}\n`;
        } catch {
            text += '📝 *Status:* N/A\n';
        }

        await sock.sendMessage(from, { text }, { quoted: message });
    }
};
