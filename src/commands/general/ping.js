import config from '../../config.js';
import constants from '../../constants.js';
import moment from 'moment';

export default {
    name: 'ping',
    aliases: ['p', 'latency'],
    category: 'general',
    description: 'Check bot response time and server latency',
    usage: 'ping',
    example: 'ping',
    cooldown: 3,
    permissions: [],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        const startTime = Date.now();
        
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeString = `${hours}h ${minutes}m ${seconds}s`;
        
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const responseText = `╭──⦿【 🏓 PING STATUS 】
│ ⚡ 𝗦𝗽𝗲𝗲𝗱: ${responseTime}ms
│ 📡 𝗟𝗮𝘁𝗲𝗻𝗰𝘆: Ultra Fast
│ 🔋 𝗦𝘁𝗮𝘁𝘂𝘀: Online & Active
╰────────⦿

╭──⦿【 💻 SYSTEM INFO 】
│ ⏰ 𝗨𝗽𝘁𝗶𝗺𝗲: ${uptimeString}
│ 🧠 𝗠𝗲𝗺𝗼𝗿𝘆: ${memoryMB}MB / ${totalMB}MB
│ 🖥️ 𝗣𝗹𝗮𝘁𝗳𝗼𝗿𝗺: ${process.platform}
│ 📦 𝗡𝗼𝗱𝗲: ${process.version}
│ 🌐 𝗠𝗼𝗱𝗲: ${isGroup ? 'Group Chat' : 'Private Chat'}
╰────────⦿

╭──⦿【 🤖 BOT INFO 】
│ 🎯 𝗡𝗮𝗺𝗲: ${config.botName}
│ 📌 𝗩𝗲𝗿𝘀𝗶𝗼𝗻: ${constants.BOT_VERSION}
│ 👨‍💻 𝗗𝗲𝘃: ${constants.BOT_AUTHOR}
│ 🕐 𝗧𝗶𝗺𝗲: ${moment().format('HH:mm:ss')}
│ 📅 𝗗𝗮𝘁𝗲: ${moment().format('DD/MM/YYYY')}
╰────────⦿

╭─────────────⦿
│💫 | [ ${config.botName} 🍀 ]
╰────────────⦿`;

        await sock.sendMessage(from, {
            text: responseText
        }, { quoted: message });
    }
};