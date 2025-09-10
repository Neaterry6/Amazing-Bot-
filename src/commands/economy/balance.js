const config = require('../../config');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'money', 'coins'],
    category: 'economy',
    description: 'Check your current balance',
    usage: 'balance [@user]',
    cooldown: 3,
    permissions: ['user'],

    async execute(sock, message, args, { user, mentionedUsers }) {
        if (!config.economy.enabled) {
            return sock.sendMessage(message.key.remoteJid, {
                text: '❌ Economy system is currently disabled.'
            });
        }

        const targetUser = mentionedUsers[0] || user;
        const isOwn = targetUser.id === user.id;
        
        const balance = 1000 + Math.floor(Math.random() * 5000);
        const bank = Math.floor(Math.random() * 10000);
        const total = balance + bank;

        const balanceText = `💰 *${isOwn ? 'Your' : targetUser.name + "'s"} Balance*

💵 *Cash:* ${config.economy.currency.symbol}${balance.toLocaleString()}
🏦 *Bank:* ${config.economy.currency.symbol}${bank.toLocaleString()}
💎 *Total:* ${config.economy.currency.symbol}${total.toLocaleString()}

📊 *Quick Stats:*
• Daily claimed: ✅
• Weekly claimed: ❌
• Last work: 2 hours ago

💡 *Commands:*
• ${config.prefix}daily - Get daily bonus
• ${config.prefix}work - Earn money
• ${config.prefix}shop - Buy items
• ${config.prefix}transfer - Send money

⚠️ Note: Economy features require database setup`;

        await sock.sendMessage(message.key.remoteJid, { text: balanceText });
    }
};