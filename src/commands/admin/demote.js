module.exports = {
    name: 'demote',
    aliases: ['demoteuser', 'removeadmin'],
    category: 'admin',
    description: 'Remove admin privileges from a user',
    usage: 'demote [@user]',
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
                text: '❌ *Bot Not Admin*\n\nI need to be an admin to demote users.'
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
                    text: '❌ *No Target*\n\nReply to a message or mention a user to demote.\n\n*Usage:* .demote [@user]'
                });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const targetUser = groupMetadata.participants.find(p => p.id === targetJid);

            if (!targetUser) {
                return await sock.sendMessage(from, {
                    text: '❌ *User Not Found*\n\nThis user is not in the group.'
                });
            }

            if (targetUser.admin !== 'admin' && targetUser.admin !== 'superadmin') {
                return await sock.sendMessage(from, {
                    text: '❌ *Not Admin*\n\nThis user is not an admin.'
                });
            }

            await sock.groupParticipantsUpdate(from, [targetJid], 'demote');

            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(from, {
                text: `👤 *User Demoted*\n\n*User:* @${targetNumber}\n*Action:* Removed admin privileges\n\nUser is now a regular member.`,
                mentions: [targetJid]
            });

        } catch (error) {
            console.error('Demote command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to demote user. Make sure I have admin permissions and the target is an admin.'
            });
        }
    }
};