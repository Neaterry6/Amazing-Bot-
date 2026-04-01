export default {
    name: 'stalk',
    aliases: ['stalker', 'lookup'],
    category: 'utility',
    description: 'Stalker/lookup command for WhatsApp user or group metadata',
    usage: 'stalk @user OR stalk 234XXXXXXXXXX OR stalk group',
    cooldown: 3,

    async execute({ sock, message, args, from, isGroup }) {
        const mention = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            || message.message?.extendedTextMessage?.contextInfo?.participant;

        if ((args[0] || '').toLowerCase() === 'group') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ Use this in a group for group stalking.' }, { quoted: message });
            const meta = await sock.groupMetadata(from);
            return await sock.sendMessage(from, {
                text: `🕵️ *Group Stalker*\n\nName: ${meta.subject}\nJID: ${meta.id}\nMembers: ${meta.participants?.length || 0}\nCreated: ${meta.creation ? new Date(meta.creation * 1000).toLocaleString() : 'Unknown'}`
            }, { quoted: message });
        }

        const raw = mention || `${(args[0] || '').replace(/\D/g, '')}@s.whatsapp.net`;
        if (!raw || raw === '@s.whatsapp.net') {
            return await sock.sendMessage(from, { text: '❌ Mention a user or pass a number.' }, { quoted: message });
        }

        const [result] = await sock.onWhatsApp(raw);
        if (!result?.exists) {
            return await sock.sendMessage(from, { text: '❌ User not found on WhatsApp.' }, { quoted: message });
        }

        await sock.sendMessage(from, {
            text: `🕵️ *User Stalker*\n\nJID: ${result.jid}\nNumber: +${result.jid.split('@')[0]}\nBusiness: ${result.biz ? 'Yes' : 'No'}\nStatus: Found ✅`,
            mentions: [result.jid]
        }, { quoted: message });
    }
};
