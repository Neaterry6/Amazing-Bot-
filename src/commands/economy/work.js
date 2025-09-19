import config from '../../config.js';
import { getUser, updateUser  } from '../../models/User.js';




export default {
    name: 'work',
    aliases: ['job', 'earn'],
    category: 'economy',
    description: 'Work to earn money',
    usage: 'work',
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
            const lastWork = user.economy.lastWork;
            const workCooldown = config.economy.workCooldown || 3600000; // 1 hour

            // Check work cooldown
            if (lastWork) {
                const timeSinceLastWork = now.getTime() - lastWork.getTime();
                
                if (timeSinceLastWork < workCooldown) {
                    const timeLeft = workCooldown - timeSinceLastWork;
                    const minutesLeft = Math.ceil(timeLeft / 60000);
                    const hoursLeft = Math.floor(minutesLeft / 60);
                    const remainingMinutes = minutesLeft % 60;

                    let timeString = '';
                    if (hoursLeft > 0) timeString += `${hoursLeft}h `;
                    if (remainingMinutes > 0) timeString += `${remainingMinutes}m`;

                    return await sock.sendMessage(from, {
                        text: `⏰ *Work Cooldown*\n\n🕐 *Available in:* ${timeString}\n⚡ *Last worked:* ${lastWork.toLocaleTimeString()}\n\n💡 *While waiting:*\n• ${prefix}daily - Claim daily reward\n• ${prefix}gamble - Try your luck\n• ${prefix}shop - Spend your earnings`
                    });
                }
            }

            // Work jobs with different success rates and earnings
            const jobs = [
                { name: 'Freelance Developer', emoji: '💻', baseEarn: [200, 500], success: 0.8 },
                { name: 'Delivery Driver', emoji: '🚗', baseEarn: [100, 300], success: 0.9 },
                { name: 'Content Creator', emoji: '📹', baseEarn: [150, 400], success: 0.75 },
                { name: 'Online Tutor', emoji: '📚', baseEarn: [120, 350], success: 0.85 },
                { name: 'Social Media Manager', emoji: '📱', baseEarn: [180, 450], success: 0.8 },
                { name: 'Graphic Designer', emoji: '🎨', baseEarn: [160, 420], success: 0.75 },
                { name: 'Data Entry Clerk', emoji: '📊', baseEarn: [80, 200], success: 0.95 },
                { name: 'Customer Support', emoji: '☎️', baseEarn: [90, 250], success: 0.9 },
                { name: 'Translation Service', emoji: '🌐', baseEarn: [140, 380], success: 0.8 },
                { name: 'Virtual Assistant', emoji: '🤖', baseEarn: [110, 320], success: 0.85 }
            ];

            const randomJob = jobs[Math.floor(Math.random() * jobs.length)];

            await sock.sendMessage(from, {
                text: `💼 *Starting Work...*\n\n${randomJob.emoji} *Job:* ${randomJob.name}\n💰 *Potential earnings:* ${config.economy.currency.symbol}${randomJob.baseEarn[0]}-${randomJob.baseEarn[1]}\n📊 *Success rate:* ${(randomJob.success * 100)}%\n\n⏱️ Working hard...`
            });

            setTimeout(async () => {
                try {
                    const isSuccess = Math.random() < randomJob.success;
                    
                    user.economy.lastWork = now;

                    if (isSuccess) {
                        // Successful work
                        const baseEarnings = Math.floor(Math.random() * (randomJob.baseEarn[1] - randomJob.baseEarn[0] + 1)) + randomJob.baseEarn[0];
                        
                        // Apply level bonus (5% per level)
                        const levelMultiplier = 1 + (user.economy.level * 0.05);
                        
                        // Apply items bonus if user has work-enhancing items
                        let itemBonus = 1;
                        const inventory = user.economy.inventory || [];
                        
                        if (inventory.find(item => item.item === 'laptop')) itemBonus += 0.15;
                        if (inventory.find(item => item.item === 'coffee')) itemBonus += 0.1;
                        if (inventory.find(item => item.item === 'phone')) itemBonus += 0.05;
                        
                        // Premium bonus
                        const premiumMultiplier = user.isPremium ? 1.2 : 1;
                        
                        let totalEarnings = Math.floor(baseEarnings * levelMultiplier * itemBonus * premiumMultiplier);
                        
                        // Random success bonus (20% chance for extra)
                        if (Math.random() < 0.2) {
                            const bonus = Math.floor(totalEarnings * 0.3);
                            totalEarnings += bonus;
                        }

                        user.economy.balance += totalEarnings;

                        // Add transaction
                        user.economy.transactions.push({
                            type: 'work',
                            amount: totalEarnings,
                            description: `Worked as ${randomJob.name}`,
                            timestamp: now
                        });

                        // Add XP
                        const xpGained = Math.floor(totalEarnings / 50); // 1 XP per $50 earned
                        const levelUpResult = user.addXP(xpGained);

                        await updateUser(user.jid, user);

                        let resultText = `✅ *Work Successful!*\n\n`;
                        resultText += `${randomJob.emoji} *Job:* ${randomJob.name}\n`;
                        resultText += `💰 *Base earnings:* ${config.economy.currency.symbol}${baseEarnings.toLocaleString()}\n`;
                        
                        if (levelMultiplier > 1) {
                            resultText += `⬆️ *Level bonus:* x${levelMultiplier.toFixed(2)}\n`;
                        }
                        
                        if (itemBonus > 1) {
                            resultText += `📦 *Item bonus:* x${itemBonus.toFixed(2)}\n`;
                        }
                        
                        if (premiumMultiplier > 1) {
                            resultText += `👑 *Premium bonus:* x${premiumMultiplier}\n`;
                        }
                        
                        resultText += `\n💵 *Total earned:* ${config.economy.currency.symbol}${totalEarnings.toLocaleString()}\n`;
                        resultText += `🏦 *New balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n`;
                        resultText += `✨ *XP gained:* +${xpGained}\n`;

                        if (levelUpResult.levelUp) {
                            resultText += `\n🎊 *LEVEL UP!* You're now level ${levelUpResult.newLevel}!\n`;
                            resultText += `💰 *Level up bonus:* ${config.economy.currency.symbol}${(levelUpResult.newLevel * 50).toLocaleString()}`;
                        }

                        resultText += `\n⏰ *Next work:* 1 hour\n`;
                        resultText += `💡 *Tip:* Buy items from ${prefix}shop to boost earnings!`;

                        await sock.sendMessage(from, { text: resultText });

                    } else {
                        // Failed work
                        const reasons = [
                            'Client cancelled the project',
                            'Technical difficulties occurred',
                            'Missed the deadline',
                            'Communication issues',
                            'Requirements changed',
                            'Market conditions unfavorable',
                            'Equipment malfunction',
                            'Internet connectivity issues'
                        ];

                        const failReason = reasons[Math.floor(Math.random() * reasons.length)];

                        await updateUser(user.jid, user);

                        const resultText = `❌ *Work Failed*\n\n${randomJob.emoji} *Job:* ${randomJob.name}\n💔 *Reason:* ${failReason}\n💰 *Earnings:* ${config.economy.currency.symbol}0\n\n😔 Better luck next time!\n⏰ *Next attempt:* 1 hour\n\n💡 *Tips to improve success:*\n• Level up for better rates\n• Buy helpful items\n• Try different job types`;

                        await sock.sendMessage(from, { text: resultText });
                    }

                } catch (error) {
                    await sock.sendMessage(from, {
                        text: '❌ *Work Error*\n\nFailed to process work session. Please try again.'
                    });
                }
            }, 3000);

        } catch (error) {
            console.error('Work command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to process work request.'
            });
        }
    }
};