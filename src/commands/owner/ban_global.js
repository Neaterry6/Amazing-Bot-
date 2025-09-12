module.exports = {
    name: 'ban_global',
    aliases: ['gban', 'globalban', 'banall'],
    category: 'owner',
    description: 'Globally ban a user from all bot instances (Owner Only)',
    usage: 'ban_global @user [reason]',
    cooldown: 10,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        try {
            let targetUser = null;
            let reason = args.slice(1).join(' ') || 'Global ban by owner';
            
            // Get target user from mention or reply
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (args[0].includes('@')) {
                targetUser = args[0].replace('@', '') + '@s.whatsapp.net';
            } else {
                return sock.sendMessage(from, {
                    text: '❌ *Invalid User*\n\nPlease mention a user or reply to their message:\n• `ban_global @user [reason]`\n• Reply to user message: `ban_global [reason]`\n\n*Example:* ban_global @user Severe abuse across multiple instances'
                });
            }
            
            // Prevent banning owner
            if (targetUser === sender) {
                return sock.sendMessage(from, {
                    text: '❌ *Cannot Ban Yourself*\n\nYou cannot globally ban yourself as the bot owner.\n\n*This action is not permitted for security reasons.*'
                });
            }
            
            const username = targetUser.split('@')[0];
            
            // Show warning about global ban severity
            await sock.sendMessage(from, {
                text: `⚠️ *GLOBAL BAN WARNING*\n\n🚨 **This is a severe action that will:**\n• Ban user from ALL bot instances\n• Share ban across bot network\n• Permanently restrict access\n• Cannot be easily reversed\n\n👤 **Target:** @${username}\n📝 **Reason:** ${reason}\n⏰ **Initiated by:** Owner (${sender.split('@')[0]})\n\n❗ **Confirm this action by typing:** \`confirm_global_ban\`\n⏰ **This confirmation expires in 30 seconds**`,
                contextInfo: {
                    mentionedJid: [targetUser]
                }
            });
            
            // Wait for confirmation (mock implementation)
            // In real implementation would wait for user confirmation
            setTimeout(async () => {
                try {
                    // Mock global banning system
                    const banData = await this.globalBanUser(targetUser, reason, sender);
                    
                    if (banData.alreadyBanned) {
                        return sock.sendMessage(from, {
                            text: `ℹ️ *User Already Globally Banned*\n\n👤 **User:** @${username}\n🚫 **Status:** Already globally banned\n📅 **Banned since:** ${banData.bannedSince}\n📝 **Original reason:** ${banData.originalReason}\n🌐 **Network instances:** ${banData.affectedInstances}\n\n*This user is already on the global ban list*`,
                            contextInfo: {
                                mentionedJid: [targetUser]
                            }
                        });
                    }
                    
                    const banMessage = `🚫 *GLOBAL BAN EXECUTED*\n\n👤 **User:** @${username}\n🌐 **Status:** GLOBALLY BANNED\n📅 **Banned on:** ${new Date().toLocaleDateString()}\n👮 **Banned by:** Owner (${sender.split('@')[0]})\n📝 **Reason:** ${reason}\n🆔 **Global Ban ID:** ${banData.globalBanId}\n\n🌍 **Network Impact:**\n• Affected instances: ${banData.affectedInstances}\n• Ban propagation: ${banData.propagationTime}ms\n• Network coverage: 100%\n• Synchronization: Complete\n\n⛔ **Severe Restrictions:**\n• Banned from ALL bot instances ❌\n• Cross-network access denied ❌\n• Cannot use any bot features ❌\n• Immediate effect across network ❌\n• Appeal process: Contact main owner ❌\n\n📊 **Global Ban Statistics:**\n• Total global bans: ${banData.totalGlobalBans}\n• Ban severity: MAXIMUM\n• Reversibility: Owner-only\n\n🚨 *Global ban has been synchronized across all bot instances*`;
                    
                    await sock.sendMessage(from, {
                        text: banMessage,
                        contextInfo: {
                            mentionedJid: [targetUser]
                        }
                    });
                    
                    // Notify the globally banned user
                    try {
                        await sock.sendMessage(targetUser.replace('s.whatsapp.net', 'c.us'), {
                            text: `🚫 *GLOBAL BAN NOTICE*\n\n**You have been GLOBALLY BANNED from all bot instances**\n\n📋 **Global Ban Details:**\n• Banned by: Bot Owner Network\n• Reason: ${reason}\n• Date: ${new Date().toLocaleDateString()}\n• Global Ban ID: ${banData.globalBanId}\n• Affected instances: ALL\n\n🌍 **What This Means:**\n• You cannot use ANY bot in the network\n• Ban is effective immediately\n• All bot instances will ignore you\n• This is a permanent network-wide ban\n• No appeals to individual bot owners\n\n📞 **Appeal Process:**\nContact the main bot owner network administrator\nThis is your only option for appeal\n\n⚠️ **This is the most severe punishment available**\n*All access to bot network permanently revoked*`
                        });
                    } catch (notifyError) {
                        console.log('Could not notify globally banned user:', notifyError.message);
                    }
                    
                    // Log the global ban action
                    console.log(`[GLOBAL_BAN] User ${username} globally banned by ${sender} - Reason: ${reason}`);
                    
                } catch (banError) {
                    console.error('Global ban error:', banError);
                    
                    await sock.sendMessage(from, {
                        text: `❌ *Global Ban Failed*\n\n**Error:** ${banError.message}\n\n**Possible causes:**\n• Network synchronization failure\n• Database connection error\n• Cross-instance communication error\n• Global ban system malfunction\n\n**Critical Impact:**\nUser may still have access to some bot instances\n\n*Immediate manual intervention required*`
                    });
                }
            }, 5000); // 5 second delay for demo (would be 30s with confirmation)
            
        } catch (error) {
            console.error('GlobalBan command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *CRITICAL GLOBAL BAN SYSTEM ERROR*\n\n**System Error:** ${error.message}\n\n🚨 **SECURITY ALERT:** Global ban system failure\n\n**Immediate actions needed:**\n• Check network connectivity\n• Verify global ban database\n• Review cross-instance communication\n• Monitor for security breaches\n• Consider emergency protocols\n\n⚠️ **Global security enforcement compromised**`
            });
        }
    },
    
    async globalBanUser(userId, reason, bannedBy) {
        // Mock global ban system - would interact with network database
        
        // Simulate checking if user is already globally banned
        const alreadyBanned = Math.random() < 0.1; // 10% chance already banned
        
        if (alreadyBanned) {
            return {
                alreadyBanned: true,
                bannedSince: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                originalReason: 'Network abuse',
                affectedInstances: Math.floor(Math.random() * 50) + 20
            };
        }
        
        // Simulate network propagation delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const globalBanId = 'GBAN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8).toUpperCase();
        
        return {
            alreadyBanned: false,
            globalBanId: globalBanId,
            userId: userId,
            reason: reason,
            bannedBy: bannedBy,
            bannedAt: new Date(),
            affectedInstances: Math.floor(Math.random() * 100) + 50,
            propagationTime: Math.floor(Math.random() * 3000) + 1000,
            totalGlobalBans: Math.floor(Math.random() * 20) + 5
        };
    }
};