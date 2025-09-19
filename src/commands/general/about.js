import config from '../../config.js';



export default {
    name: 'about',
    aliases: ['info', 'botinfo'],
    category: 'general',
    description: 'Get detailed information about the bot',
    usage: 'about',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender }) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const uptimeString = `${hours}h ${minutes}m`;
        
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        
        const aboutText = `🤖 *ABOUT ${config.botName || 'WhatsApp Bot'}*

━━━━━━━━━━━━━━━━━━━━━

📋 **BOT INFORMATION:**
├ Name: ${config.botName || 'WhatsApp Bot'}
├ Version: ${config.botVersion || '1.0.0'}
├ Developer: ${config.developerName || 'Bot Developer'}
├ Language: JavaScript (Node.js)
├ Library: @whiskeysockets/baileys
├ Platform: ${process.platform}
╰ Node.js: ${process.version}

📊 **PERFORMANCE STATS:**
├ Uptime: ${uptimeString}
├ Memory Usage: ${memoryMB} MB
├ Commands: 100+ available
├ Categories: 8 categories
╰ Status: Online ✅

🌟 **FEATURES:**
├ 🎮 Interactive Games (12 games)
├ 🤖 AI Integration (ChatGPT/Gemini)
├ 📥 Media Downloader (YouTube/TikTok)
├ 🎨 Media Processing (Stickers/Effects)
├ 🛡️ Admin Tools (Moderation/Security)
├ 💰 Economy System (Coins/Gambling)
├ 🔧 Utility Tools (QR/Base64/Hash)
╰ 📊 Analytics & Statistics

📞 **SUPPORT:**
├ Support Group: ${config.supportGroup || 'Contact Owner'}
├ Updates Channel: ${config.updatesChannel || 'Not Available'}
├ Owner: ${config.ownerName || 'Bot Owner'}
╰ Repository: ${config.repoUrl || 'Private'}

━━━━━━━━━━━━━━━━━━━━━

💡 *Type \`help\` to see all available commands*
🚀 *Join our support group for updates and help*

*✨ Built with ❤️ for the WhatsApp community ✨*`;

        await sock.sendMessage(from, { text: aboutText });
    }
};