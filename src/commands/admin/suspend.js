import { setSuspend, clearSuspend } from '../../utils/suspendStore.js';

function parseDurationMs(text) {
    const n = parseInt(text, 10);
    if (Number.isNaN(n)) return null;
    if (/hour|hr|h/i.test(text)) return n * 60 * 60 * 1000;
    return n * 60 * 1000;
}

export default {
    name: 'suspend',
    aliases: ['tempsilence'],
    category: 'admin',
    description: 'Temporarily delete a user messages in group for specified time',
    usage: 'suspend @user 30 minutes | suspend @user stop',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, args }) {
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
        const target = replied || mentioned[0];
        if (!target) return await sock.sendMessage(from, { text: '❌ Mention or reply a user.' }, { quoted: message });

        const action = (args.slice(1).join(' ') || '').trim().toLowerCase();
        if (!action) return await sock.sendMessage(from, { text: '❌ Provide duration. Example: suspend @user 30 minutes' }, { quoted: message });

        if (action === 'stop') {
            await clearSuspend(from, target);
            return await sock.sendMessage(from, { text: `✅ Suspension stopped for @${target.split('@')[0]}`, mentions: [target] }, { quoted: message });
        }

        const durationMs = parseDurationMs(action);
        if (!durationMs || durationMs < 60_000) {
            return await sock.sendMessage(from, { text: '❌ Invalid duration. Example: 30 minutes or 1 hour.' }, { quoted: message });
        }

        const until = Date.now() + durationMs;
        await setSuspend(from, target, until);
        await sock.sendMessage(from, {
            text: `✅ Suspended @${target.split('@')[0]} for ${Math.round(durationMs / 60000)} minutes. Their new messages will be deleted until stop/time ends.`,
            mentions: [target]
        }, { quoted: message });
    }
};
