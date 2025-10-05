import config from '../../config.js';
import { commandHandler } from '../../handlers/commandHandler.js';
import moment from 'moment';

export default {
    name: 'stats',
    aliases: ['stat', 'botstat'],
    category: 'general',
    description: 'Display bot usage statistics',
    usage: 'stats',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from, user, isGroup }) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        
        const commandCount = commandHandler.getCommandCount();
        const topCommands = commandHandler.getTopCommands(5);
        const categories = commandHandler.getAllCategories();

        const response = `╭──⦿【 📊 BOT STATISTICS 】
│ 🕐 𝗧𝗶𝗺𝗲: ${moment().format('HH:mm:ss')}
│ 📅 𝗗𝗮𝘁𝗲: ${moment().format('DD/MM/YYYY')}
│ 📆 𝗗𝗮𝘆: ${moment().format('dddd')}
╰────────⦿

╭──⦿【 ⚡ SYSTEM STATS 】
│ ⏰ 𝗨𝗽𝘁𝗶𝗺𝗲: ${hours}h ${minutes}m ${seconds}s
│ 🧠 𝗠𝗲𝗺𝗼𝗿𝘆: ${memoryMB}MB / ${totalMB}MB
│ 🖥️ 𝗣𝗹𝗮𝘁𝗳𝗼𝗿𝗺: ${process.platform}
│ 📦 𝗡𝗼𝗱𝗲: ${process.version}
│ 🌐 𝗠𝗼𝗱𝗲: ${isGroup ? 'Group' : 'Private'}
╰────────⦿

╭──⦿【 🎯 COMMAND STATS 】
│ 📂 𝗧𝗼𝘁𝗮𝗹: ${commandCount} Commands
│ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝗶𝗲𝘀: ${categories.length}
│ 🔋 𝗦𝘁𝗮𝘁𝘂𝘀: Active ✅
╰────────⦿

╭──⦿【 🔥 TOP COMMANDS 】
${topCommands.map((cmd, i) => `│ ${i + 1}. ✧${cmd.name} (${cmd.used} uses)`).join('\n')}
╰────────⦿

╭──⦿【 ⚡ PERFORMANCE 】
│ 📡 𝗥𝗲𝘀𝗽𝗼𝗻𝘀𝗲: Ultra Fast
│ 🔗 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗶𝗼𝗻: Stable
│ 🔋 𝗦𝘁𝗮𝘁𝘂𝘀: Online ✅
╰────────⦿

╭─────────────⦿
│💫 | [ ${config.botName} 🍀 ]
╰────────────⦿`;

        await sock.sendMessage(from, { 
            text: response 
        }, { quoted: message });
    }
};