const config = require('../../config');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'money', 'coins'],
    category: 'economy',
    description: 'Check your current balance',
    usage: 'balance [@user]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        const balance = 1000 + Math.floor(Math.random() * 5000);
        const bank = Math.floor(Math.random() * 10000);
        const total = balance + bank;

        const balanceText = `💰 *Your Balance*

💵 *Cash:* $${balance.toLocaleString()}
🏦 *Bank:* $${bank.toLocaleString()}
💎 *Total:* $${total.toLocaleString()}

📊 *Quick Stats:*
• Daily claimed: ✅
• Weekly claimed: ❌
• Last work: 2 hours ago

💡 *Commands:*
• ${prefix}daily - Get daily bonus
• ${prefix}work - Earn money
• ${prefix}shop - Buy items
• ${prefix}transfer - Send money

⚠️ Note: Economy features require database setup`;

        await sock.sendMessage(from, { text: balanceText });
    }
};