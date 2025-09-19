import config from '../../config.js';
import { commandHandler } from '../../handlers/commandHandler.js';

export default {
    name: 'help',
    aliases: ['h', 'menu', 'commands'],
    category: 'general',
    description: 'Display bot commands and features',
    usage: 'help [command]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, prefix }) {
        
        if (args.length > 0) {
            const commandName = args[0].toLowerCase();
            const command = commandHandler.getCommand(commandName);
            
            if (!command) {
                return sock.sendMessage(from, {
                    text: `❌ Command "${commandName}" not found.`
                });
            }
            
            const helpText = `╭─「 *${command.name.toUpperCase()}* 」
│ 📝 *Description:* ${command.description || 'No description'}
│ 🏷️ *Category:* ${command.category}
│ 📖 *Usage:* ${prefix}${command.usage || command.name}
│ ⏱️ *Cooldown:* ${command.cooldown || 0}s
│ 👥 *Permissions:* ${(command.permissions || ['user']).join(', ')}
${command.aliases ? `│ 🔗 *Aliases:* ${command.aliases.join(', ')}` : ''}
╰────────────────`;
            
            return sock.sendMessage(from, { text: helpText });
        }
        
        const categories = commandHandler.getAllCategories();
        const totalCommands = commandHandler.getCommandCount();
        
        let helpText = `╭─「 *${config.botName} HELP MENU* 」
│ 🤖 *Bot Version:* ${config.botVersion}
│ 📊 *Total Commands:* ${totalCommands}
│ 🔧 *Prefix:* ${prefix}
│ 
│ 📚 *CATEGORIES:*\n`;

        for (const category of categories) {
            const commands = commandHandler.getCommandsByCategory(category);
            helpText += `│ • ${category.toUpperCase()}: ${commands.length} commands\n`;
        }
        
        helpText += `│ 
│ 💡 *Usage:* ${prefix}help [command] for details
│ 🌐 *Support:* ${config.supportGroup || 'Contact owner'}
╰────────────────

*🚀 QUICK COMMANDS:*
• ${prefix}ping - Check bot latency
• ${prefix}info - Bot information
• ${prefix}owner - Contact owner
• ${prefix}status - Bot status`;

        await sock.sendMessage(from, { text: helpText });
    }
};