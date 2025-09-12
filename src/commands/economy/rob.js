const { getUser, updateUser } = require('../../models/User');
const config = require('../../config');

module.exports = {
    name: 'rob',
    aliases: ['steal', 'heist'],
    category: 'economy',
    description: 'Attempt to rob money from another user',
    usage: 'rob [@user]',
    cooldown: 3600, // 1 hour cooldown
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            if (!config.economy.enabled) {
                return await sock.sendMessage(from, {
                    text: '❌ *Economy Disabled*\n\nThe economy system is currently disabled.'
                });
            }

            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            if (mentionedUsers.length === 0) {
                return await sock.sendMessage(from, {
                    text: `🔫 *Robbery System*\n\n*Usage:* ${prefix}rob [@user]\n\n*How it works:*\n• 🎯 50% success chance\n• 💰 Steal 5-15% of target's cash\n• ⚡ 1 hour cooldown\n• 🛡️ Minimum $100 target balance\n• 💸 $50 fine if caught\n\n*Tips:*\n• Target users with high balance\n• Rob during their offline hours\n• Have backup money for fines\n\n*Example:* ${prefix}rob @username`
                });
            }

            const targetJid = mentionedUsers[0];
            const robberJid = message.key.participant || from;

            if (targetJid === robberJid) {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Target*\n\nYou cannot rob yourself! Try robbing someone else.'
                });
            }

            // Check robbery cooldown
            const lastRob = user.economy.lastRob;
            const cooldownTime = config.economy.robCooldown || 3600000; // 1 hour
            
            if (lastRob && Date.now() - lastRob.getTime() < cooldownTime) {
                const timeLeft = Math.ceil((cooldownTime - (Date.now() - lastRob.getTime())) / 60000);
                return await sock.sendMessage(from, {
                    text: `⏰ *Robbery Cooldown*\n\nYou can rob again in ${timeLeft} minutes.\n\nCooldown prevents spam and keeps the game fair!`
                });
            }

            // Get target user
            let target = await getUser(targetJid);
            if (!target) {
                return await sock.sendMessage(from, {
                    text: '❌ *Target Not Found*\n\nThis user is not registered in the economy system.'
                });
            }

            // Check if target has enough money
            if (target.economy.balance < 100) {
                return await sock.sendMessage(from, {
                    text: `❌ *Target Too Poor*\n\nTarget must have at least $100 to rob.\n\n*Target's balance:* ${config.economy.currency.symbol}${target.economy.balance.toLocaleString()}\n\nFind a richer target! 💰`
                });
            }

            // Check if robber has enough money for potential fine
            if (user.economy.balance < 50) {
                return await sock.sendMessage(from, {
                    text: '❌ *Insufficient Funds*\n\nYou need at least $50 to cover potential robbery fines.\n\nEarn more money first!'
                });
            }

            await sock.sendMessage(from, {
                text: `🔫 *Robbery in Progress...*\n\n🎯 *Target:* @${targetJid.split('@')[0]}\n💰 *Target's Cash:* ${config.economy.currency.symbol}${target.economy.balance.toLocaleString()}\n\n🤞 Attempting robbery...\n⏱️ Please wait...`,
                mentions: [targetJid]
            });

            setTimeout(async () => {
                try {
                    const successChance = 0.5; // 50% success rate
                    const success = Math.random() < successChance;
                    
                    user.economy.lastRob = new Date();

                    if (success) {
                        // Successful robbery
                        const stealPercentage = Math.random() * 0.1 + 0.05; // 5-15%
                        const stolenAmount = Math.floor(target.economy.balance * stealPercentage);
                        const maxSteal = Math.min(stolenAmount, 5000); // Max $5000 per robbery
                        
                        user.economy.balance += maxSteal;
                        target.economy.balance -= maxSteal;

                        // Add transactions
                        user.economy.transactions.push({
                            type: 'rob',
                            amount: maxSteal,
                            description: `Successfully robbed @${targetJid.split('@')[0]}`,
                            timestamp: new Date()
                        });

                        target.economy.transactions.push({
                            type: 'rob',
                            amount: -maxSteal,
                            description: `Robbed by @${robberJid.split('@')[0]}`,
                            timestamp: new Date()
                        });

                        await Promise.all([
                            updateUser(user.jid, user),
                            updateUser(target.jid, target)
                        ]);

                        const result = `🎉 *Robbery Successful!*\n\n💰 *Stolen:* ${config.economy.currency.symbol}${maxSteal.toLocaleString()}\n🎯 *From:* @${targetJid.split('@')[0]}\n📊 *Percentage:* ${(stealPercentage * 100).toFixed(1)}%\n\n💵 *Your new balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n📉 *Target's new balance:* ${config.economy.currency.symbol}${target.economy.balance.toLocaleString()}\n\n⏰ *Next robbery available in:* 1 hour`;

                        await sock.sendMessage(from, {
                            text: result,
                            mentions: [targetJid, robberJid]
                        });

                        // Notify target
                        try {
                            await sock.sendMessage(targetJid, {
                                text: `🚨 *You've been robbed!*\n\n💸 *Lost:* ${config.economy.currency.symbol}${maxSteal.toLocaleString()}\n🔫 *Robber:* @${robberJid.split('@')[0]}\n\n💵 *Your remaining balance:* ${config.economy.currency.symbol}${target.economy.balance.toLocaleString()}\n\n🛡️ *Tip:* Keep money in bank to prevent robberies!\nUse ${prefix}deposit to secure your money.`,
                                mentions: [robberJid]
                            });
                        } catch (e) {
                            // Target might have privacy settings
                        }

                    } else {
                        // Failed robbery - pay fine
                        const fine = 50;
                        user.economy.balance -= fine;

                        user.economy.transactions.push({
                            type: 'rob',
                            amount: -fine,
                            description: `Failed robbery attempt on @${targetJid.split('@')[0]} - Fine paid`,
                            timestamp: new Date()
                        });

                        await updateUser(user.jid, user);

                        const result = `💸 *Robbery Failed!*\n\n🚨 You were caught trying to rob @${targetJid.split('@')[0]}!\n\n💰 *Fine paid:* ${config.economy.currency.symbol}${fine}\n💵 *Your new balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n\n😔 Better luck next time!\n⏰ *Next attempt in:* 1 hour`;

                        await sock.sendMessage(from, {
                            text: result,
                            mentions: [targetJid]
                        });

                        // Notify target of failed attempt
                        try {
                            await sock.sendMessage(targetJid, {
                                text: `🛡️ *Robbery attempt thwarted!*\n\n👮 @${robberJid.split('@')[0]} tried to rob you but failed!\n💰 Your money is safe: ${config.economy.currency.symbol}${target.economy.balance.toLocaleString()}\n\n💡 Consider keeping money in bank for extra security!`,
                                mentions: [robberJid]
                            });
                        } catch (e) {
                            // Target might have privacy settings
                        }
                    }

                } catch (error) {
                    await sock.sendMessage(from, {
                        text: '❌ *Robbery Error*\n\nFailed to process robbery attempt.'
                    });
                }
            }, 3000);

        } catch (error) {
            console.error('Rob command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to process robbery request.'
            });
        }
    }
};