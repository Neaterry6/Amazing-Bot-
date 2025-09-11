const config = require('../../config');
const { commandHandler } = require('../../handlers/commandHandler');

module.exports = {
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
        
        const commandCount = commandHandler.getCommandCount();
        const topCommands = commandHandler.getTopCommands(5);

        const response = `╭─「 *BOT STATISTICS* 」
│ 📊 *System Stats:*
│ • Uptime: ${hours}h ${minutes}m ${seconds}s
│ • Memory Usage: ${memoryMB} MB
│ • Platform: ${process.platform}
│ • Node Version: ${process.version}
│ 
│ 🎯 *Command Stats:*
│ • Total Commands: ${commandCount}
│ • Categories: ${commandHandler.getAllCategories().length}
│ • Mode: ${isGroup ? 'Group' : 'Private'}
│ 
│ 🔥 *Top Commands:*
${topCommands.map((cmd, i) => `│ ${i + 1}. ${cmd.name} (${cmd.used} uses)`).join('\n')}
│ 
│ ⚡ *Performance:*
│ • Response Time: Fast
│ • Connection: Stable
│ • Status: Online ✅
╰────────────────

*${config.botName} - Statistics Dashboard* 📈`;

        await sock.sendMessage(from, { text: response });
    }
};