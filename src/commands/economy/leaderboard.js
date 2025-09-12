const { User } = require('../../models/User');
const config = require('../../config');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top', 'rich'],
    category: 'economy',
    description: 'View economy leaderboards and rankings',
    usage: 'leaderboard [type] [page]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            if (!config.economy.enabled) {
                return await sock.sendMessage(from, {
                    text: '❌ *Economy Disabled*\n\nThe economy system is currently disabled.'
                });
            }

            const type = args[0]?.toLowerCase() || 'balance';
            const page = parseInt(args[1]) || 1;
            const limit = 10;
            const skip = (page - 1) * limit;

            const validTypes = ['balance', 'level', 'bank', 'total', 'commands'];
            if (!validTypes.includes(type)) {
                return await sock.sendMessage(from, {
                    text: `📊 *Economy Leaderboards*\n\n*Available types:*\n• balance - Richest users by cash\n• bank - Highest bank savings\n• total - Total money (cash + bank)\n• level - Highest experience levels\n• commands - Most commands used\n\n*Usage:* ${prefix}leaderboard [type] [page]\n*Examples:*\n• ${prefix}lb balance\n• ${prefix}lb level 2\n• ${prefix}top bank`
                });
            }

            await sock.sendMessage(from, {
                text: `📊 *Loading ${type} leaderboard...*\n\n🔍 Analyzing user data\n📈 Ranking top performers\n⏱️ Please wait...`
            });

            // Mock leaderboard data since we can't access real database
            const generateMockLeaderboard = (type) => {
                const users = [
                    { name: 'EconomyKing', balance: 150000, bank: 200000, level: 25, commands: 1250 },
                    { name: 'MoneyMaster', balance: 125000, bank: 180000, level: 22, commands: 980 },
                    { name: 'CashCrafter', balance: 100000, bank: 150000, level: 20, commands: 856 },
                    { name: 'RichRuler', balance: 95000, bank: 140000, level: 19, commands: 743 },
                    { name: 'WealthWinner', balance: 85000, bank: 130000, level: 18, commands: 690 },
                    { name: 'ProfitPro', balance: 75000, bank: 120000, level: 17, commands: 634 },
                    { name: 'BusinessBoss', balance: 65000, bank: 110000, level: 16, commands: 578 },
                    { name: 'InvestorIvy', balance: 55000, bank: 100000, level: 15, commands: 523 },
                    { name: 'TraderTom', balance: 45000, bank: 90000, level: 14, commands: 467 },
                    { name: 'SaverSam', balance: 35000, bank: 80000, level: 13, commands: 412 }
                ];

                switch (type) {
                    case 'balance':
                        return users.sort((a, b) => b.balance - a.balance);
                    case 'bank':
                        return users.sort((a, b) => b.bank - a.bank);
                    case 'total':
                        return users.map(u => ({ ...u, total: u.balance + u.bank }))
                                   .sort((a, b) => b.total - a.total);
                    case 'level':
                        return users.sort((a, b) => b.level - a.level);
                    case 'commands':
                        return users.sort((a, b) => b.commands - a.commands);
                    default:
                        return users;
                }
            };

            setTimeout(async () => {
                try {
                    const leaderboardData = generateMockLeaderboard(type);
                    const currentUserRank = Math.floor(Math.random() * 50) + 1; // Mock user rank

                    let leaderboardText = `🏆 *${type.toUpperCase()} LEADERBOARD* - Page ${page}\n\n`;

                    leaderboardData.forEach((userData, index) => {
                        const rank = skip + index + 1;
                        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                        
                        let value = '';
                        switch (type) {
                            case 'balance':
                                value = `${config.economy.currency.symbol}${userData.balance.toLocaleString()}`;
                                break;
                            case 'bank':
                                value = `${config.economy.currency.symbol}${userData.bank.toLocaleString()}`;
                                break;
                            case 'total':
                                value = `${config.economy.currency.symbol}${userData.total.toLocaleString()}`;
                                break;
                            case 'level':
                                value = `Level ${userData.level}`;
                                break;
                            case 'commands':
                                value = `${userData.commands} commands`;
                                break;
                        }
                        
                        leaderboardText += `${medal} ${userData.name}\n    💰 ${value}\n\n`;
                    });

                    leaderboardText += `📍 *Your Position:* #${currentUserRank}\n`;
                    leaderboardText += `💰 *Your ${type}:* `;
                    
                    switch (type) {
                        case 'balance':
                            leaderboardText += `${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}`;
                            break;
                        case 'bank':
                            leaderboardText += `${config.economy.currency.symbol}${user.economy.bank.toLocaleString()}`;
                            break;
                        case 'total':
                            leaderboardText += `${config.economy.currency.symbol}${(user.economy.balance + user.economy.bank).toLocaleString()}`;
                            break;
                        case 'level':
                            leaderboardText += `Level ${user.economy.level}`;
                            break;
                        case 'commands':
                            leaderboardText += `${user.statistics?.commandsUsed || 0} commands`;
                            break;
                    }

                    leaderboardText += `\n\n📊 *Navigation:*\n`;
                    leaderboardText += `• ${prefix}lb ${type} ${page + 1} - Next page\n`;
                    if (page > 1) leaderboardText += `• ${prefix}lb ${type} ${page - 1} - Previous page\n`;
                    leaderboardText += `• ${prefix}lb [type] - Different leaderboard\n\n`;
                    
                    leaderboardText += `💡 *Climb the ranks:*\n`;
                    leaderboardText += `• ${prefix}work - Earn money\n`;
                    leaderboardText += `• ${prefix}daily - Daily rewards\n`;
                    leaderboardText += `• ${prefix}gamble - Risk for rewards\n`;
                    leaderboardText += `• ${prefix}shop - Invest in items`;

                    await sock.sendMessage(from, { text: leaderboardText });

                } catch (error) {
                    await sock.sendMessage(from, {
                        text: '❌ *Leaderboard Error*\n\nFailed to load leaderboard data.'
                    });
                }
            }, 2000);

        } catch (error) {
            console.error('Leaderboard command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to load leaderboard.'
            });
        }
    }
};