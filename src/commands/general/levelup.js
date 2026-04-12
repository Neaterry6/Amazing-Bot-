import { createCanvas } from '@napi-rs/canvas';
import { getUser, createUser } from '../../models/User.js';

function getLevelData(user) {
    const level = user?.economy?.level || 1;
    const xp = user?.economy?.xp || 0;
    const nextXp = Math.max(level * 100, 100);
    return { level, xp, nextXp };
}

export default {
    name: 'levelup',
    aliases: ['lvlup'],
    category: 'general',
    description: 'Generate a level-up card image',
    usage: 'levelup',
    cooldown: 6,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, from, sender }) {
        try {
            let user = await getUser(sender);
            if (!user) {
                user = await createUser({
                    jid: sender,
                    phone: sender.split('@')[0],
                    name: message.pushName || 'User',
                    economy: { balance: 1000, bank: 0, level: 1, xp: 0, rank: 'Beginner', dailyStreak: 0 },
                    statistics: { commandsUsed: 0, messagesSent: 0, lastActive: new Date() }
                });
            }

            const name = message.pushName || user?.name || 'User';
            const { level, xp, nextXp } = getLevelData(user);
            const progress = Math.max(0, Math.min(1, xp / nextXp));

            const canvas = createCanvas(1000, 360);
            const ctx = canvas.getContext('2d');

            const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            g.addColorStop(0, '#111827');
            g.addColorStop(1, '#1f2937');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 44px Sans';
            ctx.fillText('🎉 LEVEL UP!', 40, 80);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 34px Sans';
            ctx.fillText(name, 40, 140);

            ctx.fillStyle = '#d1d5db';
            ctx.font = '24px Sans';
            ctx.fillText(`You reached level ${level}`, 40, 185);

            ctx.fillStyle = '#374151';
            ctx.fillRect(40, 240, 920, 40);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(40, 240, Math.floor(920 * progress), 40);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Sans';
            ctx.fillText(`${xp} / ${nextXp} XP`, 430, 267);

            const buffer = canvas.toBuffer('image/png');
            await sock.sendMessage(from, {
                image: buffer,
                caption: `🚀 ${name}, keep going! Next milestone awaits.`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ levelup failed: ${error.message}` }, { quoted: message });
        }
    }
};
