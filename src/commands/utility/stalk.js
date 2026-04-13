export default {
    name: 'stalk',
    aliases: ['stalker', 'lookup'],
    category: 'utility',
    description: 'Stalker/lookup command for WhatsApp user or group metadata',
    usage: 'stalk @user OR stalk 234XXXXXXXXXX OR stalk group',
    cooldown: 3,

    async execute({ sock, message, args, from, isGroup }) {
        const normalizeNum = (value = '') => String(value)
            .replace(/@s\.whatsapp\.net|@c\.us|@lid|:\d+/g, '')
            .replace(/[^0-9]/g, '');

        const mention = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            || message.message?.extendedTextMessage?.contextInfo?.participant;

        if ((args[0] || '').toLowerCase() === 'group') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ Use this in a group for group stalking.' }, { quoted: message });
            const meta = await sock.groupMetadata(from);
            return await sock.sendMessage(from, {
                text: `🕵️ *Group Stalker*\n\nName: ${meta.subject}\nJID: ${meta.id}\nMembers: ${meta.participants?.length || 0}\nCreated: ${meta.creation ? new Date(meta.creation * 1000).toLocaleString() : 'Unknown'}`
            }, { quoted: message });
        }

        const rawInput = mention || args[0] || '';
        const num = normalizeNum(rawInput);
        const raw = num ? `${num}@s.whatsapp.net` : '';
        if (!raw || raw === '@s.whatsapp.net') {
            return await sock.sendMessage(from, { text: '❌ Mention a user or pass a number.' }, { quoted: message });
        }

        const [result] = await sock.onWhatsApp(raw).catch(() => []);
        if (!result?.exists) {
            return await sock.sendMessage(from, { text: '❌ User not found on WhatsApp.' }, { quoted: message });
        }

        const targetJid = result.jid;
        let profilePic = null;
        let statusText = 'Unknown';
        let statusTime = 'Unknown';
        let name = targetJid.split('@')[0];
        try {
            profilePic = await sock.profilePictureUrl(targetJid, 'image');
        } catch {}
        try {
            const fetched = await sock.fetchStatus(targetJid);
            if (fetched?.status) statusText = fetched.status;
            if (fetched?.setAt) statusTime = new Date(fetched.setAt).toLocaleString();
        } catch {}
        try {
            const [contact] = await sock.onWhatsApp(targetJid);
            if (contact?.notify) name = contact.notify;
        } catch {}

        const caption = `🕵️ *User Stalker*\n\n👤 Name: ${name}\n🆔 JID: ${targetJid}\n📱 Number: +${targetJid.split('@')[0]}\n🏢 Business: ${result.biz ? 'Yes' : 'No'}\n📝 Bio: ${statusText}\n🕒 Bio Updated: ${statusTime}\n✅ Status: Found`;

        if (profilePic) {
            return await sock.sendMessage(from, {
                image: { url: profilePic },
                caption,
                mentions: [targetJid]
            }, { quoted: message });
        }

        await sock.sendMessage(from, { text: caption, mentions: [targetJid] }, { quoted: message });
    }
};
