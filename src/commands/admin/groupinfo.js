export default {
    name: 'groupinfo',
    aliases: ['groupdetails', 'ginfo', 'group'],
    category: 'admin',
    description: 'Get detailed information about the group with group picture',
    usage: 'groupinfo',
    example: 'groupinfo',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Group only command\n│\n│ 💡 This command works in groups\n╰────────⦿'
            }, { quoted: message });
        }

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const { subject, desc, participants, creation, owner, id } = groupMetadata;

            const totalMembers = participants.length;
            const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            const superAdmins = participants.filter(p => p.admin === 'superadmin');
            const regularAdmins = participants.filter(p => p.admin === 'admin');
            const regularMembers = totalMembers - admins.length;

            const creationDate = new Date(creation * 1000).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            
            const creationTime = new Date(creation * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const ownerNumber = owner ? owner.split('@')[0] : 'Unknown';
            const groupId = id.split('@')[0];

            let groupInfo = `╭──⦿【 📋 GROUP INFO 】
│
│ 📝 𝗡𝗮𝗺𝗲: ${subject}
│ 🆔 𝗚𝗿𝗼𝘂𝗽 𝗜𝗗: ${groupId}
│ 👤 𝗢𝘄𝗻𝗲𝗿: @${ownerNumber}
│ 📅 𝗖𝗿𝗲𝗮𝘁𝗲𝗱: ${creationDate}
│ ⏰ 𝗧𝗶𝗺𝗲: ${creationTime}
│
╰────────⦿

╭──⦿【 📊 STATISTICS 】
│
│ 👥 𝗧𝗼𝘁𝗮𝗹 𝗠𝗲𝗺𝗯𝗲𝗿𝘀: ${totalMembers}
│ 👑 𝗦𝘂𝗽𝗲𝗿 𝗔𝗱𝗺𝗶𝗻𝘀: ${superAdmins.length}
│ 👮 𝗔𝗱𝗺𝗶𝗻𝘀: ${regularAdmins.length}
│ 👤 𝗠𝗲𝗺𝗯𝗲𝗿𝘀: ${regularMembers}
│
╰────────⦿
`;

            if (desc && desc.trim()) {
                const description = desc.length > 200 ? desc.substring(0, 200) + '...' : desc;
                groupInfo += `
╭──⦿【 📄 DESCRIPTION 】
│
│ ${description.replace(/\n/g, '\n│ ')}
│
╰────────⦿
`;
            }

            if (admins.length > 0) {
                groupInfo += `
╭──⦿【 👑 ADMINS LIST 】
│
`;
                admins.forEach((admin, index) => {
                    const number = admin.id.split('@')[0];
                    const role = admin.admin === 'superadmin' ? '👑 Super Admin' : '👮 Admin';
                    groupInfo += `│ ${index + 1}. ${role}\n│    @${number}\n│\n`;
                });
                groupInfo += `╰────────⦿
`;
            }

            groupInfo += `
╭─────────────⦿
│💫 | [ Ilom Bot 🍀 ]
╰────────────⦿`;

            let groupPicture;
            try {
                groupPicture = await sock.profilePictureUrl(from, 'image');
            } catch (err) {
                groupPicture = 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            }

            const allMentions = [owner, ...admins.map(a => a.id)].filter(Boolean);

            await sock.sendMessage(from, {
                image: { url: groupPicture },
                caption: groupInfo,
                mentions: allMentions
            }, { quoted: message });

        } catch (error) {
            console.error('Group info command error:', error);
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Failed to fetch info
│
│ ⚠️ 𝗗𝗲𝘁𝗮𝗶𝗹𝘀: ${error.message}
│ 💡 Try again later
╰────────⦿`
            }, { quoted: message });
        }
    }
};