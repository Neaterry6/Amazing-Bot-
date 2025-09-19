export default {
    name: 'leaderboard',
    aliases: ['lb', 'top', 'ranking'],
    category: 'general',
    description: 'View leaderboards for different categories',
    usage: 'leaderboard [xp/coins/games/commands]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender, isGroup }) {
        const category = args[0]?.toLowerCase() || 'xp';
        
        const validCategories = ['xp', 'coins', 'games', 'commands', 'daily'];
        if (!validCategories.includes(category)) {
            return sock.sendMessage(from, {
                text: `❌ *Invalid Category*\n\nValid categories: ${validCategories.join(', ')}\n\n*Example:* leaderboard xp`
            });
        }
        
        try {
            // Mock leaderboard data - in real implementation, this would query database
            const leaderboardData = await this.getMockLeaderboard(category, isGroup ? from : null);
            
            const categoryInfo = {
                xp: { title: '🏆 Experience Points', icon: '⚡', unit: 'XP' },
                coins: { title: '💰 Richest Users', icon: '💎', unit: '$' },
                games: { title: '🎮 Top Gamers', icon: '🏅', unit: 'wins' },
                commands: { title: '📊 Most Active', icon: '💬', unit: 'commands' },
                daily: { title: '🔥 Daily Streaks', icon: '📅', unit: 'days' }
            };
            
            const info = categoryInfo[category];
            const userRank = leaderboardData.findIndex(user => user.id === sender) + 1;
            
            let leaderboard = `${info.title} Leaderboard\n\n`;
            leaderboard += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            leaderboardData.slice(0, 10).forEach((user, index) => {
                const position = index + 1;
                let medal = '';
                
                if (position === 1) medal = '🥇';
                else if (position === 2) medal = '🥈';  
                else if (position === 3) medal = '🥉';
                else medal = `${position}.`;
                
                const isCurrentUser = user.id === sender;
                const prefix = isCurrentUser ? '➤ ' : '';
                const suffix = isCurrentUser ? ' (YOU)' : '';
                
                leaderboard += `${prefix}${medal} @${user.username}\n`;
                leaderboard += `   ${info.icon} ${user.value.toLocaleString()} ${info.unit}${suffix}\n\n`;
            });
            
            leaderboard += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            if (userRank > 0 && userRank <= 10) {
                leaderboard += `🎯 **Your Rank:** #${userRank}/1000+\n`;
            } else if (userRank > 10) {
                leaderboard += `🎯 **Your Rank:** #${userRank}/1000+\n`;
                const userData = leaderboardData.find(u => u.id === sender);
                if (userData) {
                    leaderboard += `${info.icon} **Your ${category}:** ${userData.value.toLocaleString()} ${info.unit}\n`;
                }
            } else {
                leaderboard += `❌ **You're not ranked yet**\nStart using commands to appear on leaderboard!\n`;
            }
            
            leaderboard += `\n📊 **Leaderboard Stats:**\n`;
            leaderboard += `├ Total Users: 1,000+\n`;
            leaderboard += `├ Updated: Every hour\n`;
            leaderboard += `├ Category: ${category.toUpperCase()}\n`;
            leaderboard += `╰ Scope: ${isGroup ? 'This Group' : 'Global'}\n\n`;
            
            leaderboard += `💡 **Available Categories:**\n`;
            leaderboard += `• \`xp\` - Experience points\n`;
            leaderboard += `• \`coins\` - Economy balance  \n`;
            leaderboard += `• \`games\` - Games won\n`;
            leaderboard += `• \`commands\` - Commands used\n`;
            leaderboard += `• \`daily\` - Daily claim streaks\n\n`;
            
            leaderboard += `*🔄 Updates every hour • Use commands to climb ranks!*`;
            
            // Get mentioned users for tagging
            const mentionedUsers = leaderboardData.slice(0, 10).map(user => user.id);
            
            await sock.sendMessage(from, {
                text: leaderboard,
                contextInfo: {
                    mentionedJid: mentionedUsers
                }
            });
            
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ *Leaderboard Error*\n\nCould not load leaderboard data.\n\n*Please try again later*`
            });
        }
    },
    
    async getMockLeaderboard(category, groupId) {
        // Generate mock leaderboard data
        const mockUsers = [
            { username: 'alex_gamer', id: '1234567890@s.whatsapp.net' },
            { username: 'sarah_pro', id: '1234567891@s.whatsapp.net' },
            { username: 'mike_legend', id: '1234567892@s.whatsapp.net' },
            { username: 'luna_master', id: '1234567893@s.whatsapp.net' },
            { username: 'zx_warrior', id: '1234567894@s.whatsapp.net' },
            { username: 'ninja_ace', id: '1234567895@s.whatsapp.net' },
            { username: 'crystal_gem', id: '1234567896@s.whatsapp.net' },
            { username: 'phoenix_fire', id: '1234567897@s.whatsapp.net' },
            { username: 'storm_bolt', id: '1234567898@s.whatsapp.net' },
            { username: 'shadow_blade', id: '1234567899@s.whatsapp.net' },
            { username: 'golden_eagle', id: '1234567800@s.whatsapp.net' },
            { username: 'silver_fox', id: '1234567801@s.whatsapp.net' }
        ];
        
        // Generate values based on category
        const leaderboard = mockUsers.map((user, index) => {
            let value;
            const rank = index + 1;
            
            switch (category) {
                case 'xp':
                    value = Math.floor((20 - rank) * 1000 + Math.random() * 500);
                    break;
                case 'coins':
                    value = Math.floor((20 - rank) * 10000 + Math.random() * 5000);
                    break;
                case 'games':
                    value = Math.floor((20 - rank) * 50 + Math.random() * 25);
                    break;
                case 'commands':
                    value = Math.floor((20 - rank) * 100 + Math.random() * 50);
                    break;
                case 'daily':
                    value = Math.floor((20 - rank) * 5 + Math.random() * 10);
                    break;
                default:
                    value = Math.floor(Math.random() * 1000);
            }
            
            return {
                ...user,
                value: value
            };
        });
        
        // Sort by value descending
        return leaderboard.sort((a, b) => b.value - a.value);
    }
};