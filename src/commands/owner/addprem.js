export default {
    name: 'addprem',
    aliases: ['premium', 'prem+', 'addpremium'],
    category: 'owner',
    description: 'Add premium membership to a user (Owner Only)',
    usage: 'addprem @user [days]',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        try {
            let targetUser = null;
            let duration = parseInt(args[1]) || 30; // Default 30 days
            
            // Get target user from mention or reply
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (args[0].includes('@')) {
                targetUser = args[0].replace('@', '') + '@s.whatsapp.net';
            } else {
                return sock.sendMessage(from, {
                    text: '❌ *Invalid User*\n\nPlease mention a user or reply to their message:\n• `addprem @user [days]`\n• Reply to user message: `addprem [days]`\n\nDefault duration: 30 days'
                });
            }
            
            if (duration < 1 || duration > 3650) {
                return sock.sendMessage(from, {
                    text: '❌ *Invalid Duration*\n\nPlease specify days between 1-3650:\n• 1-30 days: Short term\n• 31-90 days: Medium term\n• 91-365 days: Long term\n• 366-3650 days: Extended term\n\n*Example:* addprem @user 90'
                });
            }
            
            const username = targetUser.split('@')[0];
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + duration);
            
            try {
                // Mock premium system - would interact with database in real implementation
                const premiumData = await this.addPremiumUser(targetUser, duration);
                
                const successMessage = `✅ *Premium Membership Added Successfully!*\n\n👤 **User:** @${username}\n💎 **Status:** Premium Active\n📅 **Duration:** ${duration} days\n⏰ **Expires:** ${expiryDate.toLocaleDateString()}\n🎖️ **Membership ID:** ${premiumData.membershipId}\n\n🌟 **Premium Benefits:**\n• Unlimited command usage\n• Priority support\n• Advanced features access\n• Exclusive commands\n• No cooldown restrictions\n• Custom preferences\n• Premium badge\n• Early feature access\n\n💡 *User has been notified of premium activation*`;
                
                await sock.sendMessage(from, {
                    text: successMessage,
                    contextInfo: {
                        mentionedJid: [targetUser]
                    }
                });
                
                // Notify the user about premium activation
                try {
                    await sock.sendMessage(targetUser.replace('s.whatsapp.net', 'c.us'), {
                        text: `🎉 *Congratulations! Premium Activated!*\n\n💎 **You are now a Premium Member!**\n\n📋 **Premium Details:**\n• Duration: ${duration} days\n• Expires: ${expiryDate.toLocaleDateString()}\n• Membership ID: ${premiumData.membershipId}\n\n🌟 **Your Premium Benefits:**\n• ✅ Unlimited commands\n• ✅ No cooldowns\n• ✅ Priority support\n• ✅ Advanced features\n• ✅ Exclusive commands\n• ✅ Custom settings\n• ✅ Premium badge\n• ✅ Beta features access\n\n💡 **Getting Started:**\nType \`help premium\` to see exclusive commands\n\n*Thank you for being a valued premium member!*`
                    });
                } catch (notifyError) {
                    console.log('Could not notify user directly:', notifyError.message);
                }
                
            } catch (premiumError) {
                console.error('Premium addition error:', premiumError);
                
                await sock.sendMessage(from, {
                    text: `❌ *Premium Addition Failed*\n\n**Error:** ${premiumError.message}\n\n**Possible causes:**\n• Database connection error\n• User already has premium\n• System resource constraints\n• Invalid user data\n\n**Solutions:**\n• Check database status\n• Verify user exists\n• Try again later\n• Check system logs\n\n*Contact system administrator if problem persists*`
                });
            }
            
        } catch (error) {
            console.error('AddPrem command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Critical Premium System Error*\n\n**System Error:** ${error.message}\n\n🚨 **Alert:** Premium system malfunction\n\n**Actions needed:**\n• Check premium database integrity\n• Review user management system\n• Verify payment processing\n• Monitor for system corruption\n\n⚠️ *Premium services may be affected*`
            });
        }
    },
    
    async addPremiumUser(userId, duration) {
        // Mock database operation - in real implementation would add to database
        const membershipId = 'PREM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            membershipId: membershipId,
            userId: userId,
            duration: duration,
            activatedAt: new Date(),
            expiresAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
        };
    }
};