export default {
    name: 'promote',
    aliases: ['promoteuser', 'makeadmin'],
    category: 'admin',
    description: 'Give admin privileges to a user',
    usage: 'promote [@user]',
    cooldown: 5,
    permissions: ['admin'],

    async execute({ sock, message, args, from, user, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            });
        }

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ *Bot Not Admin*\n\nI need to be an admin to promote users.'
            });
        }

        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let targetJid;
            if (quotedUser) {
                targetJid = quotedUser;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *No Target*\n\nReply to a message or mention a user to promote.\n\n*Usage:* .promote [@user]'
                });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const targetUser = groupMetadata.participants.find(p => p.id === targetJid);

            if (!targetUser) {
                return await sock.sendMessage(from, {
                    text: '❌ *User Not Found*\n\nThis user is not in the group.'
                });
            }

            if (targetUser.admin === 'admin' || targetUser.admin === 'superadmin') {
                return await sock.sendMessage(from, {
                    text: '❌ *Already Admin*\n\nThis user is already an admin.'
                });
            }

            await sock.groupParticipantsUpdate(from, [targetJid], 'promote');

            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(from, {
                text: `👑 *User Promoted*\n\n*User:* @${targetNumber}\n*Action:* Given admin privileges\n\nUser is now a group admin with special permissions.`,
                mentions: [targetJid]
            });

        } catch (error) {
            console.error('Promote command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to promote user. Make sure I have admin permissions.'
            });
        }
    }
};