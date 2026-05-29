import config from '../../config.js';
import { updateBotProfile } from '../../utils/botProfile.js';

export default {
    name: 'setbotname',
    aliases: ['setbot', 'botname'],
    category: 'owner',
    description: 'Set the bot display name used in help/menu messages',
    usage: 'setbotname <new name>',
    cooldown: 3,
    ownerOnly: true,

    async execute({ sock, message, args, from }) {
        const name = args.join(' ').trim();
        if (!name) {
            return await sock.sendMessage(from, {
                text: '❌ Usage: .setbotname <new bot name>'
            }, { quoted: message });
        }

        await updateBotProfile({ name });
        config.botName = name;
        process.env.BOT_NAME = name;

        return await sock.sendMessage(from, {
            text: `✅ Bot name updated to *${name}*.`
        }, { quoted: message });
    }
};
