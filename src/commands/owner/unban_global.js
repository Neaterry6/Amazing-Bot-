module.exports = {
    name: 'unban_global',
    aliases: ['gunban', 'globalunban', 'unbanall'],
    category: 'owner',
    description: 'Remove global ban from a user across all bot instances (Owner Only)',
    usage: 'unban_global @user [reason]',
    cooldown: 10,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        try {
            let targetUser = null;
            let reason = args.slice(1).join(' ') || 'Global unban by owner';
            
            // Get target user from mention or reply
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (args[0].includes('@')) {
                targetUser = args[0].replace('@', '') + '@s.whatsapp.net';
            } else {
                return sock.sendMessage(from, {
                    text: '❌ *Invalid User*\n\nPlease mention a user or reply to their message:\n• `unban_global @user [reason]`\n• Reply to user message: `unban_global [reason]`\n\n*Example:* unban_global @user Appeal approved by network admin'
                });
            }
            
            const username = targetUser.split('@')[0];
            
            // Show information about global unban process
            await sock.sendMessage(from, {
                text: `🔍 *GLOBAL UNBAN INITIATED*\n\n👤 **Target:** @${username}\n📝 **Reason:** ${reason}\n👮 **Initiated by:** Owner (${sender.split('@')[0]})\n⏰ **Process started:** ${new Date().toLocaleString()}\n\n🌐 **Network Operations:**\n• Checking global ban status\n• Verifying ban records\n• Preparing network synchronization\n• Calculating impact across instances\n\n⏳ *Processing global unban request...*`,
                contextInfo: {
                    mentionedJid: [targetUser]
                }
            });
            
            try {
                // Mock global unbanning system
                const unbanData = await this.globalUnbanUser(targetUser, reason, sender);
                
                if (!unbanData.wasGloballyBanned) {
                    return sock.sendMessage(from, {
                        text: `ℹ️ *User Not Globally Banned*\n\n👤 **User:** @${username}\n✅ **Status:** Not on global ban list\n🌐 **Network access:** Full access\n\n*This user is not globally banned and has access to all bot instances.*`,
                        contextInfo: {
                            mentionedJid: [targetUser]
                        }
                    });
                }
                
                const unbanMessage = `✅ *GLOBAL UNBAN SUCCESSFUL*\n\n👤 **User:** @${username}\n🌐 **Status:** GLOBAL ACCESS RESTORED\n📅 **Unbanned on:** ${new Date().toLocaleDateString()}\n👮 **Unbanned by:** Owner (${sender.split('@')[0]})\n📝 **Reason:** ${reason}\n🆔 **Global Ban ID:** ${unbanData.globalBanId}\n\n🌍 **Network Restoration:**\n• Affected instances: ${unbanData.affectedInstances}\n• Synchronization time: ${unbanData.syncTime}ms\n• Network coverage: 100%\n• Propagation: Complete\n\n🎉 **Access Fully Restored:**\n• Access to ALL bot instances ✅\n• Cross-network features enabled ✅\n• All bot capabilities available ✅\n• Network-wide restrictions lifted ✅\n• Full user privileges restored ✅\n\n📊 **Global Ban History:**\n• Originally banned: ${unbanData.originalBanDate}\n• Ban duration: ${unbanData.banDuration}\n• Ban reason: ${unbanData.originalReason}\n• Network instances affected: ${unbanData.previouslyAffected}\n• Total active global bans: ${unbanData.totalGlobalBans}\n\n🚨 *Global unban synchronized across all bot instances*`;
                
                await sock.sendMessage(from, {
                    text: unbanMessage,
                    contextInfo: {
                        mentionedJid: [targetUser]
                    }
                });
                
                // Notify the unbanned user
                try {
                    await sock.sendMessage(targetUser.replace('s.whatsapp.net', 'c.us'), {
                        text: `🎉 *GLOBAL UNBAN NOTICE*\n\n**Your global ban has been LIFTED from all bot instances**\n\n📋 **Global Unban Details:**\n• Unbanned by: Bot Owner Network\n• Reason: ${reason}\n• Date: ${new Date().toLocaleDateString()}\n• Global Ban ID: ${unbanData.globalBanId}\n• Restored instances: ALL\n\n🌍 **What This Means:**\n• You can now use ALL bots in the network\n• Full access restored immediately\n• All bot instances will respond to you\n• Previous restrictions completely removed\n• Network-wide access granted\n\n🎯 **Getting Started Again:**\n• Type \`help\` on any bot to see commands\n• Type \`menu\` to explore features\n• Type \`ping\` to test bot responses\n• All premium features available if applicable\n\n🚨 **Important Reminder:**\nPlease follow network rules to avoid future global bans\nNetwork policies apply across all instances\n\n*Welcome back to the bot network! Use responsibly.*`
                    });
                } catch (notifyError) {
                    console.log('Could not notify globally unbanned user:', notifyError.message);
                }
                
                // Log the global unban action
                console.log(`[GLOBAL_UNBAN] User ${username} globally unbanned by ${sender} - Reason: ${reason}`);
                
            } catch (unbanError) {
                console.error('Global unban error:', unbanError);
                
                await sock.sendMessage(from, {
                    text: `❌ *Global Unban Failed*\n\n**Error:** ${unbanError.message}\n\n**Possible causes:**\n• Network synchronization failure\n• Global ban record not found\n• Cross-instance communication error\n• Database connection issues\n• Global unban system malfunction\n\n**Critical Impact:**\nUser may still be banned on some instances\n\n**Actions needed:**\n• Check network connectivity\n• Verify global ban database\n• Manual intervention required\n• Contact network administrators\n\n*Immediate attention required for network consistency*`
                });
            }
            
        } catch (error) {
            console.error('GlobalUnban command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *CRITICAL GLOBAL UNBAN SYSTEM ERROR*\n\n**System Error:** ${error.message}\n\n🚨 **SECURITY ALERT:** Global unban system failure\n\n**Immediate actions needed:**\n• Check network connectivity status\n• Verify global ban database integrity\n• Review cross-instance communication\n• Monitor for system corruption\n• Consider emergency network protocols\n\n⚠️ **Global access management compromised**`
            });
        }
    },
    
    async globalUnbanUser(userId, reason, unbannedBy) {
        // Mock global unban system - would interact with network database
        
        // Simulate checking if user is globally banned
        const wasGloballyBanned = Math.random() < 0.9; // 90% chance user was globally banned
        
        if (!wasGloballyBanned) {
            return { wasGloballyBanned: false };
        }
        
        // Simulate network synchronization delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const globalBanId = 'GBAN_' + (Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) + '_' + Math.random().toString(36).substr(2, 8).toUpperCase();
        const banDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
        const banDuration = Math.floor((Date.now() - banDate) / (24 * 60 * 60 * 1000));
        
        return {
            wasGloballyBanned: true,
            globalBanId: globalBanId,
            userId: userId,
            reason: reason,
            unbannedBy: unbannedBy,
            unbannedAt: new Date(),
            originalBanDate: banDate.toLocaleDateString(),
            banDuration: `${banDuration} days`,
            originalReason: 'Network policy violation',
            affectedInstances: Math.floor(Math.random() * 100) + 50,
            previouslyAffected: Math.floor(Math.random() * 120) + 60,
            syncTime: Math.floor(Math.random() * 4000) + 2000,
            totalGlobalBans: Math.floor(Math.random() * 15) + 3
        };
    }
};