const { updateUser } = require('../../models/User');

module.exports = {
    name: 'unban',
    aliases: ['unblock', 'unbanuser'],
    category: 'admin',
    description: 'Remove ban from a user',
    usage: 'unban [@user]',
    cooldown: 5,
    permissions: ['admin'],

    async execute({ sock, message, args, from, user, isGroup, isGroupAdmin }) {
        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let targetJid;
            if (quotedUser) {
                targetJid = quotedUser;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
            } else if (args[0]?.includes('@')) {
                targetJid = args[0].replace('@', '') + '@s.whatsapp.net';
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Target*\n\nReply to a message, mention a user, or provide their number.\n\n*Usage:* .unban [@user]'
                });
            }

            await updateUser(targetJid, {
                $set: {
                    isBanned: false,
                    banReason: null,
                    bannedBy: null,
                    banUntil: null
                }
            });

            const targetNumber = targetJid.split('@')[0];
            const sender = message.key.participant || from;
            
            await sock.sendMessage(from, {
                text: `✅ *User Unbanned*\n\n*Target:* +${targetNumber}\n*Unbanned by:* @${sender.split('@')[0]}\n*Date:* ${new Date().toLocaleString()}\n\nUser can now use bot commands again.`,
                mentions: [sender]
            });

            try {
                await sock.sendMessage(targetJid, {
                    text: `✅ *You have been unbanned*\n\n*Unbanned by:* @${sender.split('@')[0]}\n\nYou can now use bot commands again. Please follow the rules.`,
                    mentions: [sender]
                });
            } catch (e) {
                // User might have blocked bot or privacy settings
            }

        } catch (error) {
            console.error('Unban command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to unban user. Please try again.'
            });
        }
    }
};