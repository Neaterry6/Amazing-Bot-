import config from '../../config.js';
import { getUser, updateUser  } from '../../models/User.js';




export default {
    name: 'gamble',
    aliases: ['bet', 'roll', 'dice'],
    category: 'economy',
    description: 'Gamble your money with dice roll (1-6)',
    usage: 'gamble [amount]',
    cooldown: 10,
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

            const amount = parseInt(args[0]);
            
            if (isNaN(amount) || amount <= 0) {
                return await sock.sendMessage(from, {
                    text: `❌ *Invalid Amount*\n\nPlease specify a valid amount to gamble.\n\n*Usage:* ${prefix}gamble [amount]\n*Example:* ${prefix}gamble 100`
                });
            }

            if (amount < 10) {
                return await sock.sendMessage(from, {
                    text: '❌ *Minimum Bet*\n\nMinimum gambling amount is $10.'
                });
            }

            if (amount > user.economy.balance) {
                return await sock.sendMessage(from, {
                    text: `❌ *Insufficient Funds*\n\n*Bet Amount:* ${config.economy.currency.symbol}${amount.toLocaleString()}\n*Your Balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n*Missing:* ${config.economy.currency.symbol}${(amount - user.economy.balance).toLocaleString()}\n\nEarn more money with ${prefix}work or ${prefix}daily!`
                });
            }

            await sock.sendMessage(from, {
                text: `🎲 *Rolling the dice...*\n\n💰 *Bet:* ${config.economy.currency.symbol}${amount.toLocaleString()}\n🎯 *Target:* Roll 4, 5, or 6 to win!\n\n*Rolling...*`
            });

            setTimeout(async () => {
                try {
                    const playerRoll = Math.floor(Math.random() * 6) + 1;
                    const houseRoll = Math.floor(Math.random() * 6) + 1;
                    
                    let result = '';
                    let winnings = 0;
                    let newBalance = user.economy.balance;

                    if (playerRoll >= 4) {
                        // Player wins
                        const multiplier = playerRoll === 6 ? 2.5 : playerRoll === 5 ? 2.0 : 1.5;
                        winnings = Math.floor(amount * multiplier);
                        newBalance += winnings;
                        
                        result = `🎉 *YOU WON!*\n\n🎲 *Your Roll:* ${playerRoll}\n🏠 *House Roll:* ${houseRoll}\n\n💰 *Bet:* ${config.economy.currency.symbol}${amount.toLocaleString()}\n🎁 *Winnings:* ${config.economy.currency.symbol}${winnings.toLocaleString()}\n📈 *Multiplier:* ${multiplier}x\n\n💵 *New Balance:* ${config.economy.currency.symbol}${newBalance.toLocaleString()}`;
                        
                        user.economy.transactions.push({
                            type: 'gamble',
                            amount: winnings,
                            description: `Won gambling (${playerRoll} vs ${houseRoll})`,
                            timestamp: new Date()
                        });

                    } else {
                        // Player loses
                        newBalance -= amount;
                        
                        result = `💸 *YOU LOST!*\n\n🎲 *Your Roll:* ${playerRoll}\n🏠 *House Roll:* ${houseRoll}\n\n💰 *Bet:* ${config.economy.currency.symbol}${amount.toLocaleString()}\n💔 *Lost:* ${config.economy.currency.symbol}${amount.toLocaleString()}\n\n💵 *New Balance:* ${config.economy.currency.symbol}${newBalance.toLocaleString()}\n\n*Better luck next time!*`;
                        
                        user.economy.transactions.push({
                            type: 'gamble',
                            amount: -amount,
                            description: `Lost gambling (${playerRoll} vs ${houseRoll})`,
                            timestamp: new Date()
                        });
                    }

                    user.economy.balance = newBalance;
                    await updateUser(user.jid, user);

                    result += `\n\n🎲 *How to Win:*\n• Roll 4, 5, or 6 to win\n• Roll 6 = 2.5x multiplier\n• Roll 5 = 2.0x multiplier\n• Roll 4 = 1.5x multiplier\n• Roll 1-3 = Lose bet`;

                    await sock.sendMessage(from, { text: result });

                } catch (error) {
                    await sock.sendMessage(from, {
                        text: '❌ *Gambling Error*\n\nFailed to process gamble. Your money is safe!'
                    });
                }
            }, 3000);

        } catch (error) {
            console.error('Gamble command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to process gambling request.'
            });
        }
    }
};