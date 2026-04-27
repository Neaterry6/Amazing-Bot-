export default {
    name: 'hijack',
    aliases: ['takeovergc'],
    category: 'admin',
    description: 'Demote all group admins (except owner and bot) and rename group to hijack by ilombot',
    usage: 'hijack',
    cooldown: 12,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, sender }) {
        try {
            const meta = await sock.groupMetadata(from);
            const botId = sock?.user?.id || '';
            const botUser = botId.split(':')[0] + '@s.whatsapp.net';

            const admins = meta.participants.filter((p) => p.admin);
            const demoteTargets = admins
                .filter((p) => p.id !== botUser)
                .filter((p) => p.id !== sender)
                .filter((p) => p.admin !== 'superadmin')
                .map((p) => p.id);

            if (!demoteTargets.length) {
                await sock.groupUpdateSubject(from, 'hijack by ilombot');
                return await sock.sendMessage(from, {
                    text: '⚠️ No eligible admins to demote. Group name has been updated to *hijack by ilombot*.'
                }, { quoted: message });
            }

            const chunks = [];
            for (let i = 0; i < demoteTargets.length; i += 10) chunks.push(demoteTargets.slice(i, i + 10));
            for (const ids of chunks) {
                await sock.groupParticipantsUpdate(from, ids, 'demote');
            }

            await sock.groupUpdateSubject(from, 'hijack by ilombot');

            return await sock.sendMessage(from, {
                text: [
                    '✅ *Hijack completed*',
                    `Demoted admins: ${demoteTargets.length}`,
                    'New group name: hijack by ilombot'
                ].join('\n'),
                mentions: demoteTargets
            }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, {
                text: `❌ Hijack failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
