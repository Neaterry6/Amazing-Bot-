import config from '../../config.js';
import { updateGroup  } from '../../models/Group.js';




export default {
    name: 'antilink',
    aliases: ['anti-link', 'linkprotection'],
    category: 'admin',
    description: 'Toggle antilink protection in the group',
    usage: 'antilink [on/off]',
    cooldown: 5,
    permissions: ['admin'],
    args: false,

    async execute({ sock, message, args, from, user, group, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            });
        }

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ *Bot Not Admin*\n\nI need to be an admin to manage antilink protection.'
            });
        }

        try {
            const action = args[0]?.toLowerCase();
            const currentStatus = group?.settings?.antiLink || false;

            if (!action) {
                return await sock.sendMessage(from, {
                    text: `🔗 *Antilink Status*\n\n*Current:* ${currentStatus ? 'Enabled ✅' : 'Disabled ❌'}\n\n*Usage:* ${config.prefix}antilink [on/off]`
                });
            }

            let newStatus;
            if (action === 'on' || action === 'enable' || action === '1') {
                newStatus = true;
            } else if (action === 'off' || action === 'disable' || action === '0') {
                newStatus = false;
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Option*\n\nUse: on/off, enable/disable, or 1/0'
                });
            }

            await updateGroup(from, {
                $set: { 'settings.antiLink': newStatus }
            });

            const statusText = newStatus ? 'Enabled ✅' : 'Disabled ❌';
            const actionText = newStatus ? 
                'Links will now be automatically deleted and users warned.' : 
                'Links are now allowed in this group.';

            await sock.sendMessage(from, {
                text: `🔗 *Antilink Protection*\n\n*Status:* ${statusText}\n\n${actionText}`
            });

        } catch (error) {
            console.error('Antilink command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to update antilink settings.'
            });
        }
    }
};