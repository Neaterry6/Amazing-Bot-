module.exports = {
    name: 'tagall',
    aliases: ['mentionall', 'everyone'],
    category: 'admin',
    description: 'Tag all group members with a message',
    usage: 'tagall [message]',
    cooldown: 15,
    permissions: ['admin'],

    async execute({ sock, message, args, from, user, isGroup, isGroupAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            });
        }

        try {
            const text = args.join(' ') || 'Group Notification';
            
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);

            let tagMessage = `📢 *GROUP ANNOUNCEMENT*\n\n${text}\n\n`;
            tagMessage += `*Tagged Members:*\n`;
            
            participants.forEach((participant, index) => {
                const number = participant.split('@')[0];
                tagMessage += `${index + 1}. @${number}\n`;
            });

            tagMessage += `\n*Total Members:* ${participants.length}`;

            await sock.sendMessage(from, {
                text: tagMessage,
                mentions: participants
            });

        } catch (error) {
            console.error('Tag all command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to tag all members.'
            });
        }
    }
};