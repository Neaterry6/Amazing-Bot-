module.exports = {
    name: 'delete',
    aliases: ['del', 'remove'],
    category: 'admin',
    description: 'Delete a message by replying to it',
    usage: 'delete (reply to message)',
    cooldown: 3,
    permissions: ['admin'],

    async execute({ sock, message, args, from, user, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            });
        }

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ *Bot Not Admin*\n\nI need to be an admin to delete messages.'
            });
        }

        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage) {
            return await sock.sendMessage(from, {
                text: '❌ *No Message*\n\nReply to the message you want to delete.'
            });
        }

        try {
            const quotedMessageId = message.message.extendedTextMessage.contextInfo.stanzaId;
            const quotedParticipant = message.message.extendedTextMessage.contextInfo.participant;

            await sock.sendMessage(from, {
                delete: {
                    remoteJid: from,
                    fromMe: false,
                    id: quotedMessageId,
                    participant: quotedParticipant
                }
            });

            await sock.sendMessage(from, {
                text: '✅ *Message Deleted*\n\nThe selected message has been deleted.'
            });

        } catch (error) {
            console.error('Delete command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to delete the message. Make sure I have admin permissions.'
            });
        }
    }
};