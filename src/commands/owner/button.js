import { isTopOwner } from '../../utils/privilegedUsers.js';
import { getButtonMode, setButtonMode } from '../../utils/buttonMode.js';

export default {
    name: 'button',
    aliases: ['buttonmode', 'btnmode'],
    category: 'owner',
    description: 'Enable or disable global interactive button features',
    usage: 'button <on|off|status>',
    cooldown: 2,
    ownerOnly: true,
    minArgs: 0,

    async execute({ sock, message, from, sender, args, prefix }) {
        if (!isTopOwner(sender)) {
            return sock.sendMessage(from, { text: '❌ Only the bot owner can use this command.' }, { quoted: message });
        }

        const action = String(args[0] || 'status').toLowerCase();
        if (!['on', 'off', 'status'].includes(action)) {
            return sock.sendMessage(from, {
                text: `❌ Usage: ${prefix}button <on|off|status>`
            }, { quoted: message });
        }

        if (action === 'status') {
            const enabled = await getButtonMode();
            return sock.sendMessage(from, {
                text: `🎛️ Button mode is currently *${enabled ? 'ON' : 'OFF'}*.`
            }, { quoted: message });
        }

        const enabled = await setButtonMode(action === 'on');
        return sock.sendMessage(from, {
            text: `✅ Button mode turned *${enabled ? 'ON' : 'OFF'}* successfully.`
        }, { quoted: message });
    }
};
