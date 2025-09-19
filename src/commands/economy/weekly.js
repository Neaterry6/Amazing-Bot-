import config from '../../config.js';
import { getUser, updateUser  } from '../../models/User.js';




export default {
    name: 'weekly',
    aliases: ['week', 'weeklyreward'],
    category: 'economy',
    description: 'Claim your weekly reward',
    usage: 'weekly',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            if (!config.economy.enabled) {
                return await sock.sendMessage(from, {
                    text: '❌ *Economy Disabled*\n\nThe economy system is currently disabled.'
                });
            }

            const now = new Date();
            const lastWeekly = user.economy.lastWeekly;
            const weeklyAmount = config.economy.weeklyAmount || 500;
            const cooldownTime = 7 * 24 * 60 * 60 * 1000; // 7 days

            // Check if user can claim weekly
            if (lastWeekly) {
                const timeSinceLastWeekly = now.getTime() - lastWeekly.getTime();
                
                if (timeSinceLastWeekly < cooldownTime) {
                    const timeLeft = cooldownTime - timeSinceLastWeekly;
                    const daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
                    const hoursLeft = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                    const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                    let timeString = '';
                    if (daysLeft > 0) timeString += `${daysLeft}d `;
                    if (hoursLeft > 0) timeString += `${hoursLeft}h `;
                    if (minutesLeft > 0) timeString += `${minutesLeft}m`;

                    return await sock.sendMessage(from, {
                        text: `⏰ *Weekly Cooldown*\n\n🗓️ *Next weekly available in:* ${timeString}\n\n💰 *Weekly reward:* ${config.economy.currency.symbol}${weeklyAmount.toLocaleString()}\n📅 *Last claimed:* ${lastWeekly.toLocaleDateString()}\n\n💡 *Tip:* Use ${prefix}daily for daily rewards while waiting!`
                    });
                }
            }

            await sock.sendMessage(from, {
                text: `🗓️ *Processing weekly reward...*\n\n💰 *Calculating bonus...*\n🎁 *Preparing reward...*\n⏱️ *Please wait...*`
            });

            setTimeout(async () => {
                try {
                    // Calculate bonus based on user level and streak
                    const levelBonus = user.economy.level * 10;
                    const streakMultiplier = user.economy.dailyStreak >= 7 ? 1.5 : 1.0;
                    
                    let totalReward = weeklyAmount + levelBonus;
                    totalReward = Math.floor(totalReward * streakMultiplier);

                    // VIP bonus for premium users
                    if (user.isPremium) {
                        totalReward = Math.floor(totalReward * 1.25); // 25% bonus for premium
                    }

                    // Random bonus (10-30% chance for extra reward)
                    const bonusChance = Math.random();
                    let extraBonus = 0;
                    let bonusType = '';

                    if (bonusChance < 0.1) {
                        // 10% chance for mega bonus
                        extraBonus = Math.floor(totalReward * 0.5);
                        bonusType = '🎰 Mega Bonus';
                    } else if (bonusChance < 0.25) {
                        // 15% chance for good bonus
                        extraBonus = Math.floor(totalReward * 0.25);
                        bonusType = '🎁 Lucky Bonus';
                    } else if (bonusChance < 0.4) {
                        // 15% chance for small bonus
                        extraBonus = Math.floor(totalReward * 0.1);
                        bonusType = '⭐ Small Bonus';
                    }

                    totalReward += extraBonus;

                    // Update user data
                    user.economy.balance += totalReward;
                    user.economy.lastWeekly = now;

                    // Add transaction
                    user.economy.transactions.push({
                        type: 'weekly',
                        amount: totalReward,
                        description: 'Weekly reward claimed',
                        timestamp: now
                    });

                    // Add XP
                    const xpGained = 25;
                    const levelUpResult = user.addXP(xpGained);

                    await updateUser(user.jid, user);

                    let resultText = `🎉 *Weekly Reward Claimed!*\n\n`;
                    resultText += `💰 *Base reward:* ${config.economy.currency.symbol}${weeklyAmount.toLocaleString()}\n`;
                    resultText += `⬆️ *Level bonus:* ${config.economy.currency.symbol}${levelBonus.toLocaleString()}\n`;
                    
                    if (streakMultiplier > 1) {
                        resultText += `🔥 *Streak bonus:* x${streakMultiplier} (7+ day streak)\n`;
                    }
                    
                    if (user.isPremium) {
                        resultText += `👑 *Premium bonus:* 25% extra\n`;
                    }
                    
                    if (extraBonus > 0) {
                        resultText += `🎊 *${bonusType}:* ${config.economy.currency.symbol}${extraBonus.toLocaleString()}\n`;
                    }
                    
                    resultText += `\n💵 *Total earned:* ${config.economy.currency.symbol}${totalReward.toLocaleString()}\n`;
                    resultText += `🏦 *New balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n`;
                    resultText += `✨ *XP gained:* +${xpGained}\n`;

                    if (levelUpResult.levelUp) {
                        resultText += `\n🎊 *LEVEL UP!* You're now level ${levelUpResult.newLevel}!\n`;
                        resultText += `💰 *Level up bonus:* ${config.economy.currency.symbol}${(levelUpResult.newLevel * 50).toLocaleString()}`;
                    }

                    resultText += `\n\n📅 *Next weekly:* 7 days from now\n`;
                    resultText += `💡 *Tip:* Maintain daily streaks for bigger weekly bonuses!`;

                    await sock.sendMessage(from, { text: resultText });

                } catch (error) {
                    await sock.sendMessage(from, {
                        text: '❌ *Claim Error*\n\nFailed to process weekly reward. Please try again.'
                    });
                }
            }, 2500);

        } catch (error) {
            console.error('Weekly command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to process weekly reward request.'
            });
        }
    }
};