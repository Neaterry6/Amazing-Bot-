import config from '../../config.js';



export default {
    name: 'prefix',
    aliases: ['pre'],
    category: 'general',
    description: 'Display the bot prefix',
    usage: 'prefix',
    cooldown: 2,
    permissions: ['user'],

    async execute({ sock, message, from, prefix }) {
        const response = `╭─「 *BOT PREFIX* 」
│ 🎯 *Current Prefix:* ${config.prefix}
│ 🔄 *Secondary Prefix:* ${config.secondaryPrefix}
│ 
│ 💡 *How to use:*
│ • Type ${config.prefix}[command] 
│ • Example: ${config.prefix}help
│ • Example: ${config.prefix}ping
│ 
│ 📝 *Available Prefixes:*
│ • ${config.prefix} (Primary)
│ • ${config.secondaryPrefix} (Secondary)
│ • ! / . # > < (Alternative)
╰────────────────

*${config.botName} is ready to serve!* 🚀`;

        await sock.sendMessage(from, { text: response });
    }
};