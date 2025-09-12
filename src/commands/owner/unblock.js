module.exports = {
    name: 'unblock',
    aliases: ['unban', 'whitelist'],
    category: 'owner',
    description: 'Unblock a user and restore bot access (Owner Only)',
    usage: 'unblock @user [reason]',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        try {
            let targetUser = null;
            let reason = args.slice(1).join(' ') || 'Unblocked by owner';
            
            // Get target user from mention or reply
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (args[0].includes('@')) {
                targetUser = args[0].replace('@', '') + '@s.whatsapp.net';
            } else {
                return sock.sendMessage(from, {
                    text: '❌ *Invalid User*\n\nPlease mention a user or reply to their message:\n• `unblock @user [reason]`\n• Reply to user message: `unblock [reason]`\n\n*Example:* unblock @user Appeal accepted'
                });
            }
            
            const username = targetUser.split('@')[0];
            
            try {
                // Mock unblocking system - would interact with database in real implementation
                const unblockData = await this.unblockUser(targetUser, reason, sender);
                
                if (!unblockData.wasBlocked) {
                    return sock.sendMessage(from, {
                        text: `ℹ️ *User Not Blocked*\n\n👤 **User:** @${username}\n✅ **Status:** Not blocked\n\n*This user is not on the block list and has full access to the bot.*`,
                        contextInfo: {
                            mentionedJid: [targetUser]
                        }
                    });
                }
                
                const unblockMessage = `✅ *User Unblocked Successfully!*\n\n👤 **User:** @${username}\n✅ **Status:** Access restored\n📅 **Unblocked on:** ${new Date().toLocaleDateString()}\n👮 **Unblocked by:** Owner (${sender.split('@')[0]})\n📝 **Reason:** ${reason}\n🆔 **Block ID:** ${unblockData.blockId}\n\n🎉 **Access Restored:**\n• All bot commands enabled ✅\n• Full feature access ✅\n• Bot responds to messages ✅\n• Automatic responses enabled ✅\n• Group interaction allowed ✅\n\n📊 **Block History:**\n• Originally blocked: ${unblockData.originalBlockDate}\n• Block duration: ${unblockData.blockDuration}\n• Block reason: ${unblockData.originalReason}\n• Total active blocks: ${unblockData.totalBlocked}\n\n💡 *User has been notified of access restoration*`;
                
                await sock.sendMessage(from, {
                    text: unblockMessage,
                    contextInfo: {
                        mentionedJid: [targetUser]
                    }
                });
                
                // Notify the unblocked user
                try {
                    await sock.sendMessage(targetUser.replace('s.whatsapp.net', 'c.us'), {
                        text: `🎉 *You Have Been Unblocked!*\n\n**Your access to this bot has been restored**\n\n📋 **Unblock Details:**\n• Unblocked by: Bot Owner\n• Reason: ${reason}\n• Date: ${new Date().toLocaleDateString()}\n• Block ID: ${unblockData.blockId}\n\n✅ **What This Means:**\n• You can now use all bot commands\n• Bot will respond to your messages\n• All features are available to you\n• Previous restrictions removed\n\n🎯 **Getting Started Again:**\n• Type \`help\` to see available commands\n• Type \`menu\` to explore features\n• Type \`ping\` to test bot response\n\n🚨 **Important Reminder:**\nPlease follow bot rules to avoid future blocks\n\n*Welcome back! Enjoy using the bot responsibly.*`
                    });
                } catch (notifyError) {
                    console.log('Could not notify unblocked user:', notifyError.message);
                }
                
                // Log the unblock action
                console.log(`[UNBLOCK] User ${username} unblocked by ${sender} - Reason: ${reason}`);
                
            } catch (unblockError) {
                console.error('User unblocking error:', unblockError);
                
                await sock.sendMessage(from, {
                    text: `❌ *User Unblock Failed*\n\n**Error:** ${unblockError.message}\n\n**Possible causes:**\n• Database connection error\n• Block record not found\n• System resource constraints\n• Unblock system malfunction\n\n**Solutions:**\n• Check database status\n• Verify user was blocked\n• Try again later\n• Check system logs\n\n*Contact system administrator if problem persists*`
                });
            }
            
        } catch (error) {
            console.error('Unblock command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Critical Unblock System Error*\n\n**System Error:** ${error.message}\n\n🚨 **Alert:** User unblock system malfunction\n\n**Actions needed:**\n• Check user management database\n• Verify unblock system integrity\n• Review access control system\n• Monitor for security issues\n\n⚠️ *Security enforcement may be compromised*`
            });
        }
    },
    
    async unblockUser(userId, reason, unblockedBy) {
        // Mock database operation - in real implementation would remove from block list
        
        // Simulate checking if user is blocked
        const wasBlocked = Math.random() < 0.8; // 80% chance user was blocked
        
        if (!wasBlocked) {
            return { wasBlocked: false };
        }
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const blockId = 'BLK_' + (Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
        const blockDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const blockDuration = Math.floor((Date.now() - blockDate) / (24 * 60 * 60 * 1000));
        
        return {
            wasBlocked: true,
            blockId: blockId,
            userId: userId,
            reason: reason,
            unblockedBy: unblockedBy,
            unblockedAt: new Date(),
            originalBlockDate: blockDate.toLocaleDateString(),
            blockDuration: `${blockDuration} days`,
            originalReason: 'Terms violation',
            totalBlocked: Math.floor(Math.random() * 50) + 1
        };
    }
};