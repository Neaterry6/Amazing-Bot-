import config from '../../config.js';
import moment from 'moment';

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
        
        const aboutText = `╭──⦿【 🤖 ABOUT BOT 】
│ 🎯 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲: ${config.botName || 'Ilom Bot'}
│ 📌 𝗩𝗲𝗿𝘀𝗶𝗼𝗻: ${config.botVersion || '1.0.0'}
│ 👨‍💻 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿: ${config.ownerName || 'Ilom'}
│ 🌐 𝗣𝗹𝗮𝘁𝗳𝗼𝗿𝗺: ${process.platform}
│ 📦 𝗡𝗼𝗱𝗲: ${process.version}
│ 📚 𝗟𝗶𝗯𝗿𝗮𝗿𝘆: Baileys
╰────────⦿

╭──⦿【 📊 PERFORMANCE 】
│ ⏰ 𝗨𝗽𝘁𝗶𝗺𝗲: ${uptimeString}
│ 🧠 𝗠𝗲𝗺𝗼𝗿𝘆: ${memoryMB} MB
│ 🎮 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: 120+ Commands
│ 📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝗶𝗲𝘀: 10 Categories
│ 🔋 𝗦𝘁𝗮𝘁𝘂𝘀: Online ✅
╰────────⦿

╭──⦿【 🌟 FEATURES 】
│ ✧ 🎮 Interactive Games
│ ✧ 🤖 AI Integration
│ ✧ 📥 Media Downloader
│ ✧ 🎨 Media Processing
│ ✧ 🛡️ Admin Tools
│ ✧ 💰 Economy System
│ ✧ 🔧 Utility Tools
│ ✧ 📊 Analytics
╰────────⦿

╭──⦿【 📞 SUPPORT 】
│ 👑 𝗢𝘄𝗻𝗲𝗿: ${config.ownerName || 'Ilom'}
│ 🔗 𝗚𝗿𝗼𝘂𝗽: ${config.supportGroup || 'Available'}
│ 📡 𝗖𝗵𝗮𝗻𝗻𝗲𝗹: ${config.updatesChannel || 'Coming Soon'}
│ 🌐 𝗥𝗲𝗽𝗼: ${config.repoUrl || 'Private'}
╰────────⦿

╭─────────────⦿
│💫 | [ ${config.botName || 'Ilom Bot'} 🍀 ]
│ Built with ❤️ by ${config.ownerName || 'Ilom'}
╰────────────⦿`;

        await sock.sendMessage(from, { 
            text: aboutText 
        }, { quoted: message });
    }
};