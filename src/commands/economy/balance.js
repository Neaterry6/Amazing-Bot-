import config from '../../config.js';



export default {
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

        const balanceText = `╭──⦿【 💰 YOUR BALANCE 】
╰────────⦿

╭──⦿【 💵 WALLET 】
│ 💵 𝗖𝗮𝘀𝗵: $${balance.toLocaleString()}
│ 🏦 𝗕𝗮𝗻𝗸: $${bank.toLocaleString()}
│ 💎 𝗧𝗼𝘁𝗮𝗹: $${total.toLocaleString()}
╰────────⦿

╭──⦿【 📊 QUICK STATS 】
│ ✅ 𝗗𝗮𝗶𝗹𝘆: Claimed
│ ❌ 𝗪𝗲𝗲𝗸𝗹𝘆: Available
│ ⏰ 𝗪𝗼𝗿𝗸: 2h ago
╰────────⦿

╭──⦿【 💡 EARN MORE 】
│ ✧ ${prefix}daily - Daily bonus
│ ✧ ${prefix}work - Earn cash
│ ✧ ${prefix}gamble - Risk it
│ ✧ ${prefix}shop - Buy items
╰────────⦿

╭─────────────⦿
│ ⚠️ Economy in demo mode
╰────────────⦿`;

        await sock.sendMessage(from, { 
            text: balanceText 
        }, { quoted: message });
    }
};