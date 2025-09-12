const { getUser, updateUser } = require('../../models/User');

module.exports = {
    name: 'profile',
    aliases: ['p', 'me', 'user'],
    category: 'general',
    description: 'View user profile and statistics',
    usage: 'profile [@user]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender, isGroup }) {
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
            // In real implementation, this would fetch from database
            const userData = await this.getMockUserData(targetUser);
            
            // Calculate level and XP
            const level = Math.floor(userData.experience / 1000) + 1;
            const currentLevelXP = userData.experience % 1000;
            const nextLevelXP = 1000 - currentLevelXP;
            const xpProgress = Math.floor((currentLevelXP / 1000) * 100);
            
            // Generate XP progress bar
            const progressBar = '█'.repeat(Math.floor(xpProgress / 10)) + '░'.repeat(10 - Math.floor(xpProgress / 10));
            
            // Calculate rank based on XP (mock ranking)
            let rank = 'Beginner';
            if (userData.experience >= 10000) rank = 'Legendary';
            else if (userData.experience >= 7500) rank = 'Master';
            else if (userData.experience >= 5000) rank = 'Expert';
            else if (userData.experience >= 2500) rank = 'Advanced';
            else if (userData.experience >= 1000) rank = 'Intermediate';
            
            // Badge system
            const badges = [];
            if (userData.commandsUsed >= 100) badges.push('💬 Chatter');
            if (userData.gamesPlayed >= 50) badges.push('🎮 Gamer');
            if (userData.mediaProcessed >= 25) badges.push('🎨 Creator');
            if (userData.daysActive >= 30) badges.push('🏆 Veteran');
            if (userData.helpedOthers >= 10) badges.push('🤝 Helper');
            if (userData.isPremium) badges.push('⭐ Premium');
            
            const profile = `👤 *${targetName} Profile*

━━━━━━━━━━━━━━━━━━━━━

📊 **USER STATISTICS:**
├ Username: @${targetUser.split('@')[0]}
├ Level: ${level} (${rank})
├ Experience: ${userData.experience.toLocaleString()} XP
├ Next Level: ${nextLevelXP} XP needed
├ Progress: [${progressBar}] ${xpProgress}%
╰ Joined: ${userData.joinDate}

💰 **ECONOMY:**
├ Balance: $${userData.balance.toLocaleString()}
├ Total Earned: $${userData.totalEarned.toLocaleString()}
├ Daily Streak: ${userData.dailyStreak} days
├ Last Daily: ${userData.lastDaily}
╰ Rank: #${userData.economyRank} globally

🎮 **ACTIVITY STATS:**
├ Commands Used: ${userData.commandsUsed.toLocaleString()}
├ Messages Sent: ${userData.messagesSent.toLocaleString()}
├ Games Played: ${userData.gamesPlayed}
├ Games Won: ${userData.gamesWon}
├ Win Rate: ${userData.gamesPlayed > 0 ? Math.round((userData.gamesWon / userData.gamesPlayed) * 100) : 0}%
╰ Active Days: ${userData.daysActive}

🎨 **MEDIA ACTIVITY:**
├ Stickers Created: ${userData.stickersCreated}
├ Images Processed: ${userData.imagesProcessed}
├ Downloads: ${userData.downloadsRequested}
╰ Media Points: ${userData.mediaPoints}

🏆 **ACHIEVEMENTS & BADGES:**
${badges.length > 0 ? badges.join(' ') : 'No badges yet'}

⭐ **PREMIUM STATUS:**
${userData.isPremium ? `✅ Premium Active
├ Expires: ${userData.premiumExpiry}
├ Premium Days: ${userData.premiumDays}
╰ Benefits: Unlimited commands, priority support` : 
'❌ Not Premium\n├ Upgrade for unlimited features\n╰ Premium benefits available'}

📈 **RECENT ACTIVITY:**
├ Last Seen: ${userData.lastSeen}
├ Last Command: ${userData.lastCommand}
├ Favorite Command: ${userData.favoriteCommand}
├ Most Active Hour: ${userData.mostActiveHour}
╰ Streak: ${userData.activityStreak} days

━━━━━━━━━━━━━━━━━━━━━

${targetUser === sender ? 
'*💡 Use commands to gain XP and unlock achievements!*' :
'*🔍 Viewing another user\'s profile*'}

*🎯 Next milestone: ${this.getNextMilestone(userData.experience)} XP*`;

            await sock.sendMessage(from, {
                text: profile,
                contextInfo: targetUser !== sender ? {
                    mentionedJid: [targetUser]
                } : {}
            });
            
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ *Profile Error*\n\nCould not load user profile. Please try again later.\n\n*Error: Database connection issue*`
            });
        }
    },
    
    async getMockUserData(userId) {
        // Mock user data - in real implementation, this would be from database
        const randomSeed = userId.charCodeAt(0) + userId.length;
        
        return {
            experience: Math.floor(Math.random() * 15000) + 500,
            balance: Math.floor(Math.random() * 100000) + 1000,
            totalEarned: Math.floor(Math.random() * 500000) + 5000,
            commandsUsed: Math.floor(Math.random() * 500) + 50,
            messagesSent: Math.floor(Math.random() * 2000) + 200,
            gamesPlayed: Math.floor(Math.random() * 100) + 10,
            gamesWon: Math.floor(Math.random() * 50) + 5,
            stickersCreated: Math.floor(Math.random() * 50) + 2,
            imagesProcessed: Math.floor(Math.random() * 100) + 15,
            downloadsRequested: Math.floor(Math.random() * 75) + 8,
            mediaPoints: Math.floor(Math.random() * 1000) + 100,
            dailyStreak: Math.floor(Math.random() * 30) + 1,
            daysActive: Math.floor(Math.random() * 60) + 7,
            activityStreak: Math.floor(Math.random() * 14) + 1,
            economyRank: Math.floor(Math.random() * 10000) + 100,
            isPremium: Math.random() > 0.8, // 20% chance of premium
            premiumDays: Math.floor(Math.random() * 365) + 30,
            helpedOthers: Math.floor(Math.random() * 20) + 2,
            joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            lastDaily: Math.random() > 0.5 ? 'Today' : 'Yesterday',
            lastSeen: Math.random() > 0.3 ? 'Online now' : '2 hours ago',
            lastCommand: ['help', 'ping', 'calc', 'rps', 'weather'][Math.floor(Math.random() * 5)],
            favoriteCommand: ['rps', 'calc', 'weather', 'sticker', 'help'][Math.floor(Math.random() * 5)],
            mostActiveHour: `${Math.floor(Math.random() * 12) + 1}:00 ${Math.random() > 0.5 ? 'PM' : 'AM'}`,
            premiumExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        };
    },
    
    getNextMilestone(currentXP) {
        const milestones = [1000, 2500, 5000, 7500, 10000, 15000, 25000, 50000, 100000];
        const nextMilestone = milestones.find(milestone => milestone > currentXP);
        return nextMilestone ? nextMilestone.toLocaleString() : 'MAX LEVEL';
    }
};