module.exports = {
    name: 'setname',
    aliases: ['groupname', 'setgroupname'],
    category: 'admin',
    description: 'Change the group name',
    usage: 'setname [new name]',
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
                text: '❌ *Bot Not Admin*\n\nI need to be an admin to change group name.'
            });
        }

        try {
            const newName = args.join(' ');
            if (!newName) {
                return await sock.sendMessage(from, {
                    text: '❌ *No Name*\n\nPlease provide a new group name.\n\n*Usage:* .setname Your New Group Name'
                });
            }

            if (newName.length > 25) {
                return await sock.sendMessage(from, {
                    text: '❌ *Too Long*\n\nGroup name must be 25 characters or less.'
                });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const oldName = groupMetadata.subject;

            await sock.groupUpdateSubject(from, newName);

            const sender = message.key.participant || from;
            await sock.sendMessage(from, {
                text: `📝 *Group Name Updated*\n\n*Old Name:* ${oldName}\n*New Name:* ${newName}\n\n*Changed by:* @${sender.split('@')[0]}`,
                mentions: [sender]
            });

        } catch (error) {
            console.error('Set name command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to update group name. Make sure I have admin permissions.'
            });
        }
    }
};