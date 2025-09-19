export default {
    name: 'kick',
    aliases: ['remove'],
    category: 'admin',
    description: 'Remove a member from the group',
    usage: 'kick @user',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    args: true,

    async execute(sock, message, args, { isGroup, isBotAdmin, mentionedUsers, sender }) {
        if (!isGroup) {
            return sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command can only be used in groups!'
            });
        }

        if (!isBotAdmin) {
            return sock.sendMessage(message.key.remoteJid, {
                text: '❌ I need admin privileges to kick members!'
            });
        }

        if (mentionedUsers.length === 0) {
            return sock.sendMessage(message.key.remoteJid, {
                text: '❌ Please mention the user(s) to kick!\n\nExample: .kick @user'
            });
        }

        try {
            const groupId = message.key.remoteJid;
            const usersToKick = mentionedUsers.map(user => user.id);
            
            await sock.sendMessage(groupId, {
                text: `⚠️ Kicking ${mentionedUsers.length} member(s)...`
            });

            await sock.groupParticipantsUpdate(groupId, usersToKick, 'remove');

            const kickedUsers = mentionedUsers.map(user => `@${user.id.split('@')[0]}`).join(', ');
            
            await sock.sendMessage(groupId, {
                text: `✅ Successfully kicked: ${kickedUsers}`,
                mentions: usersToKick
            });

        } catch (error) {
            console.error('Kick command error:', error);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Failed to kick user(s). They might be admin or I lack permissions.'
            });
        }
    }
};