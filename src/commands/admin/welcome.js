import { updateGroup  } from '../../models/Group.js';

async function getProfilePic(sock, jid) {
    try { return await sock.profilePictureUrl(jid, 'image'); }
    catch { return null; }
}

export default {
    name: 'welcome',
    aliases: ['welcometext', 'setwelcome'],
    category: 'admin',
    description: 'Toggle welcome messages or set custom welcome text',
    usage: 'welcome [on/off] [custom message]',
    cooldown: 5,
    permissions: ['admin'],

    async execute({ sock, message, args, from, group, isGroup, prefix }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            });
        }

        try {
            const action = args[0]?.toLowerCase();
            const currentStatus = group?.settings?.welcome?.enabled || false;
            const currentMessage = group?.settings?.welcome?.message
                || '👋 Welcome @user to @group!\n\nKindly do intro:\n• Pics\n• Age\n• Location\n\n📌 Please read the group description.';

            if (!action) {
                return await sock.sendMessage(from, {
                    text: `👋 *Welcome Settings*\n\n*Status:* ${currentStatus ? 'Enabled ✅' : 'Disabled ❌'}\n*Message:* ${currentMessage}\n\n*Usage:*\n• ${prefix}welcome on/off\n• ${prefix}welcome set Your message here\n\n*Variables:*\n• @user - User mention\n• @group - Group name`
                });
            }

            if (action === 'on' || action === 'enable' || action === '1') {
                await updateGroup(from, {
                    $set: { 'settings.welcome.enabled': true }
                });

                await sock.sendMessage(from, {
                    text: '✅ *Welcome Messages Enabled*\n\nNew members will receive welcome messages when they join.'
                });

            } else if (action === 'off' || action === 'disable' || action === '0') {
                await updateGroup(from, {
                    $set: { 'settings.welcome.enabled': false }
                });

                await sock.sendMessage(from, {
                    text: '❌ *Welcome Messages Disabled*\n\nNew members will not receive welcome messages.'
                });

            } else if (action === 'set' || action === 'message') {
                const customMessage = args.slice(1).join(' ');
                if (!customMessage) {
                    return await sock.sendMessage(from, {
                        text: `❌ *No Message*\n\nPlease provide a custom welcome message.\n\n*Usage:* ${prefix}welcome set Welcome @user to @group!`
                    });
                }

                await updateGroup(from, {
                    $set: { 
                        'settings.welcome.message': customMessage,
                        'settings.welcome.enabled': true
                    }
                });

                await sock.sendMessage(from, {
                    text: `✅ *Custom Welcome Message Set*\n\n*New Message:* ${customMessage}\n\nWelcome messages are now enabled with your custom text.`
                });

            } else if (action === 'test') {
                const groupMeta = await sock.groupMetadata(from);
                const sourceMentions = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                const targetJid = sourceMentions[0] || message.key.participant || message.participant;
                const targetNum = String(targetJid || '').split('@')[0] || 'testuser';
                const testMessage = currentMessage
                    .replace(/@user/gi, `@${targetNum}`)
                    .replace(/@group/gi, groupMeta.subject || 'the group');

                const ppUrl = targetJid ? await getProfilePic(sock, targetJid) : null;
                if (ppUrl) {
                    await sock.sendMessage(from, {
                        image: { url: ppUrl },
                        caption: `🧪 *Welcome Message Test*\n\n${testMessage}`,
                        mentions: targetJid ? [targetJid] : []
                    });
                } else {
                    await sock.sendMessage(from, {
                        text: `🧪 *Welcome Message Test*\n\n${testMessage}`,
                        mentions: targetJid ? [targetJid] : []
                    });
                }

            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Option*\n\nUse: on/off, set [message], or test'
                });
            }

        } catch (error) {
            console.error('Welcome command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to update welcome settings.'
            });
        }
    }
};
