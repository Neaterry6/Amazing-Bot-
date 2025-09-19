import config from '../../config.js';
import { updateUser  } from '../../models/User.js';




export default {
    name: 'ban',
    aliases: ['block'],
    category: 'admin',
    description: 'Ban a user from using the bot',
    usage: 'ban [@user|reply] [reason]',
    cooldown: 5,
    permissions: ['admin'],

    async execute({ sock, message, args, from, sender, isGroup }) {
        let targetUser;
        let reason = 'No reason provided';
        
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetUser = message.message.extendedTextMessage.contextInfo.participant;
            reason = args.join(' ') || reason;
        } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            reason = args.slice(1).join(' ') || reason;
        } else if (args[0]) {
            const phone = args[0].replace(/[^0-9]/g, '');
            if (phone.length > 7) {
                targetUser = phone + '@s.whatsapp.net';
                reason = args.slice(1).join(' ') || reason;
            }
        }

        if (!targetUser) {
            return sock.sendMessage(from, {
                text: `❌ *Usage Error*\n\nPlease specify a user to ban:\n• Reply to their message\n• Mention them: @user\n• Use their number: ${config.prefix}ban 1234567890`
            });
        }

        if (config.ownerNumbers.includes(targetUser)) {
            return sock.sendMessage(from, {
                text: '❌ *Error*\n\nCannot ban the bot owner!'
            });
        }

        if (targetUser === sender) {
            return sock.sendMessage(from, {
                text: '❌ *Error*\n\nYou cannot ban yourself!'
            });
        }

        try {
            await updateUser(targetUser, {
                isBanned: true,
                banReason: reason,
                bannedAt: new Date(),
                bannedBy: sender
            });

            const response = `✅ *User Banned Successfully*

👤 *User:* @${targetUser.split('@')[0]}
📝 *Reason:* ${reason}
👮 *Banned by:* @${sender.split('@')[0]}
⏰ *Date:* ${new Date().toLocaleString()}

*This user can no longer use bot commands.*`;

            await sock.sendMessage(from, {
                text: response,
                contextInfo: {
                    mentionedJid: [targetUser, sender]
                }
            });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to ban user. Please try again.'
            });
        }
    }
};