module.exports = {
    name: 'setdesc',
    aliases: ['groupdesc', 'setdescription'],
    category: 'admin',
    description: 'Change the group description',
    usage: 'setdesc [new description]',
    cooldown: 10,
    permissions: ['admin'],

    async execute({ sock, message, args, from, user, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            });
        }

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ *Bot Not Admin*\n\nI need to be an admin to change group description.'
            });
        }

        try {
            const newDescription = args.join(' ');
            if (!newDescription) {
                return await sock.sendMessage(from, {
                    text: '❌ *No Description*\n\nPlease provide a new description.\n\n*Usage:* .setdesc Your new group description here'
                });
            }

            if (newDescription.length > 512) {
                return await sock.sendMessage(from, {
                    text: '❌ *Too Long*\n\nGroup description must be 512 characters or less.'
                });
            }

            await sock.groupUpdateDescription(from, newDescription);

            const sender = message.key.participant || from;
            await sock.sendMessage(from, {
                text: `📝 *Group Description Updated*\n\n*New Description:*\n${newDescription}\n\n*Changed by:* @${sender.split('@')[0]}`,
                mentions: [sender]
            });

        } catch (error) {
            console.error('Set description command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to update group description. Make sure I have admin permissions.'
            });
        }
    }
};