module.exports = {
    name: 'groupinfo',
    aliases: ['groupdetails', 'ginfo', 'group'],
    category: 'admin',
    description: 'Get detailed information about the group',
    usage: 'groupinfo',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, isGroup }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            });
        }

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const { subject, desc, participants, creation, owner } = groupMetadata;

            const totalMembers = participants.length;
            const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            const regularMembers = totalMembers - admins.length;

            const creationDate = new Date(creation * 1000).toLocaleDateString();
            const ownerNumber = owner ? owner.split('@')[0] : 'Unknown';

            let groupInfo = `╭─「 *GROUP INFORMATION* 」\n`;
            groupInfo += `├ 📝 *Name:* ${subject}\n`;
            groupInfo += `├ 📊 *Total Members:* ${totalMembers}\n`;
            groupInfo += `├ 👑 *Admins:* ${admins.length}\n`;
            groupInfo += `├ 👥 *Members:* ${regularMembers}\n`;
            groupInfo += `├ 📅 *Created:* ${creationDate}\n`;
            groupInfo += `├ 👤 *Owner:* +${ownerNumber}\n`;
            groupInfo += `├ 🆔 *Group ID:* ${from.split('@')[0]}\n`;

            if (desc) {
                groupInfo += `├ 📄 *Description:*\n├   ${desc.replace(/\n/g, '\n├   ')}\n`;
            }

            groupInfo += `╰────────────────\n\n`;
            groupInfo += `*👑 ADMINS LIST:*\n`;

            admins.forEach((admin, index) => {
                const number = admin.id.split('@')[0];
                const role = admin.admin === 'superadmin' ? '👑' : '👮';
                groupInfo += `${index + 1}. ${role} +${number}\n`;
            });

            await sock.sendMessage(from, {
                text: groupInfo,
                mentions: admins.map(a => a.id)
            });

        } catch (error) {
            console.error('Group info command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to fetch group information.'
            });
        }
    }
};