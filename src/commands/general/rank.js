export default {
    name: 'rank',
    aliases: ['level', 'xp', 'exp'],
    category: 'general',
    description: 'Check your or someone else\'s rank and level',
    usage: 'rank [@user]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender }) {
        let targetUser = sender;
        let targetName = 'Your';
        
        // Check if user mentioned someone or replied to a message
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetUser = message.message.extendedTextMessage.contextInfo.participant;
            targetName = `@${targetUser.split('@')[0]}'s`;
        } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            targetName = `@${targetUser.split('@')[0]}'s`;
        }
        
        try {
            // Mock rank data - in real implementation, this would fetch from database
            const userData = await this.getMockRankData(targetUser);
            
            // Calculate level progression
            const level = Math.floor(userData.totalXP / 1000) + 1;
            const currentLevelXP = userData.totalXP % 1000;
            const nextLevelXP = 1000 - currentLevelXP;
            const progressPercent = Math.floor((currentLevelXP / 1000) * 100);
            
            // Create visual progress bar
            const barLength = 20;
            const filledLength = Math.floor((currentLevelXP / 1000) * barLength);
            const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
            
            // Determine rank tier
            let tier, tierEmoji;
            if (level >= 100) { tier = 'Legendary'; tierEmoji = '🏆'; }
            else if (level >= 75) { tier = 'Master'; tierEmoji = '💎'; }
            else if (level >= 50) { tier = 'Expert'; tierEmoji = '⭐'; }
            else if (level >= 25) { tier = 'Advanced'; tierEmoji = '🔥'; }
            else if (level >= 10) { tier = 'Intermediate'; tierEmoji = '⚡'; }
            else { tier = 'Beginner'; tierEmoji = '🌱'; }
            
            // Calculate global rank
            const globalRank = Math.floor(Math.random() * 1000) + userData.totalXP / 100;
            
            // XP sources breakdown
            const xpSources = [
                { source: 'Daily Commands', xp: userData.commandXP, percent: Math.round((userData.commandXP / userData.totalXP) * 100) },
                { source: 'Game Victories', xp: userData.gameXP, percent: Math.round((userData.gameXP / userData.totalXP) * 100) },
                { source: 'Daily Bonuses', xp: userData.bonusXP, percent: Math.round((userData.bonusXP / userData.totalXP) * 100) },
                { source: 'Special Events', xp: userData.eventXP, percent: Math.round((userData.eventXP / userData.totalXP) * 100) }
            ];
            
            const rankCard = `${tierEmoji} *${targetName} Rank Card*

━━━━━━━━━━━━━━━━━━━━━

👤 **USER:** @${targetUser.split('@')[0]}
🏅 **LEVEL:** ${level} (${tier})
⚡ **TOTAL XP:** ${userData.totalXP.toLocaleString()}
🌍 **GLOBAL RANK:** #${Math.floor(globalRank)}

📊 **LEVEL PROGRESS:**
Level ${level} ▶️ Level ${level + 1}
[${progressBar}] ${progressPercent}%
${currentLevelXP}/${1000} XP (${nextLevelXP} needed)

📈 **XP BREAKDOWN:**
${xpSources.map(s => `├ ${s.source}: ${s.xp} XP (${s.percent}%)`).join('\n')}

🏆 **ACHIEVEMENTS:**
├ Commands Used: ${userData.commandsUsed.toLocaleString()}
├ Games Played: ${userData.gamesPlayed}
├ Win Rate: ${userData.winRate}%
├ Active Days: ${userData.activeDays}
├ Longest Streak: ${userData.longestStreak} days
╰ Total Messages: ${userData.messageCount.toLocaleString()}

⭐ **TIER REWARDS:**
${this.getTierRewards(tier)}

🎯 **NEXT MILESTONES:**
├ Next Level: ${nextLevelXP} XP
├ Next Tier: ${this.getNextTier(level)} (${this.getXPForNextTier(level) - userData.totalXP} XP)
╰ Leaderboard: ${globalRank <= 100 ? 'Top 100!' : `${100 - Math.floor(globalRank/10)} spots to Top 100`}

━━━━━━━━━━━━━━━━━━━━━

${level >= 100 ? '🎉 *LEGENDARY STATUS ACHIEVED!* 🎉' :
  level >= 50 ? '💫 *You\'re an Expert! Keep climbing!* 💫' :
  level >= 25 ? '🚀 *Advanced rank! Excellent progress!* 🚀' :
  level >= 10 ? '⚡ *Intermediate level! You\'re getting stronger!* ⚡' :
  '🌱 *Keep using commands to gain XP and level up!* 🌱'}

*💡 Use commands, play games, and stay active to gain XP!*`;

            await sock.sendMessage(from, {
                text: rankCard,
                contextInfo: targetUser !== sender ? {
                    mentionedJid: [targetUser]
                } : {}
            });
            
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ *Rank Error*\n\nCould not load rank data for user.\n\n*Please try again later*`
            });
        }
    },
    
    async getMockRankData(userId) {
        // Generate mock rank data based on user ID
        const seed = userId.charCodeAt(0) + userId.length;
        const totalXP = Math.floor(Math.random() * 50000) + 1000;
        
        return {
            totalXP: totalXP,
            commandXP: Math.floor(totalXP * 0.4),
            gameXP: Math.floor(totalXP * 0.3),
            bonusXP: Math.floor(totalXP * 0.2),
            eventXP: Math.floor(totalXP * 0.1),
            commandsUsed: Math.floor(totalXP / 10) + Math.floor(Math.random() * 100),
            gamesPlayed: Math.floor(Math.random() * 200) + 20,
            winRate: Math.floor(Math.random() * 40) + 30, // 30-70%
            activeDays: Math.floor(Math.random() * 100) + 10,
            longestStreak: Math.floor(Math.random() * 30) + 5,
            messageCount: Math.floor(totalXP / 5) + Math.floor(Math.random() * 1000)
        };
    },
    
    getTierRewards(tier) {
        const rewards = {
            'Legendary': '🏆 All rewards + Custom role + Exclusive commands',
            'Master': '💎 Premium features + Special badge + Priority support',
            'Expert': '⭐ Advanced commands + Increased limits + VIP access',
            'Advanced': '🔥 Bonus daily rewards + Extra game modes',
            'Intermediate': '⚡ Basic premium features + Increased cooldowns',
            'Beginner': '🌱 Standard access + Learning resources'
        };
        return rewards[tier] || 'Standard user privileges';
    },
    
    getNextTier(level) {
        if (level < 10) return 'Intermediate (Level 10)';
        if (level < 25) return 'Advanced (Level 25)';
        if (level < 50) return 'Expert (Level 50)';
        if (level < 75) return 'Master (Level 75)';
        if (level < 100) return 'Legendary (Level 100)';
        return 'MAX TIER REACHED!';
    },
    
    getXPForNextTier(level) {
        if (level < 10) return 10000; // 10 * 1000
        if (level < 25) return 25000; // 25 * 1000  
        if (level < 50) return 50000; // 50 * 1000
        if (level < 75) return 75000; // 75 * 1000
        if (level < 100) return 100000; // 100 * 1000
        return 100000; // Max
    }
};