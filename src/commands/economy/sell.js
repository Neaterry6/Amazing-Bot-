const { getUser, updateUser } = require('../../models/User');
const config = require('../../config');

module.exports = {
    name: 'sell',
    aliases: ['sellitem', 'trade'],
    category: 'economy',
    description: 'Sell items from your inventory',
    usage: 'sell [item] [quantity]',
    cooldown: 5,
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

            const itemName = args[0].toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (quantity <= 0) {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Quantity*\n\nQuantity must be greater than 0.'
                });
            }

            const inventory = user.economy.inventory || [];
            const itemIndex = inventory.findIndex(item => item.item === itemName);

            if (itemIndex === -1) {
                return await sock.sendMessage(from, {
                    text: `❌ *Item Not Found*\n\nYou don't have "${itemName}" in your inventory.\n\nUse ${prefix}inventory to see your items.`
                });
            }

            const inventoryItem = inventory[itemIndex];
            
            if (inventoryItem.quantity < quantity) {
                return await sock.sendMessage(from, {
                    text: `❌ *Insufficient Quantity*\n\n*Item:* ${itemName}\n*You have:* ${inventoryItem.quantity}\n*Trying to sell:* ${quantity}\n\nYou can only sell up to ${inventoryItem.quantity} items.`
                });
            }

            // Item prices (selling price is 70% of buying price)
            const itemPrices = {
                apple: 7,       // Buy: $10, Sell: $7
                bread: 11,      // Buy: $15, Sell: $11  
                coffee: 18,     // Buy: $25, Sell: $18
                laptop: 350,    // Buy: $500, Sell: $350
                car: 3500,      // Buy: $5000, Sell: $3500
                house: 35000,   // Buy: $50000, Sell: $35000
                diamond: 700,   // Buy: $1000, Sell: $700
                gold: 560,      // Buy: $800, Sell: $560
                phone: 210,     // Buy: $300, Sell: $210
                watch: 105,     // Buy: $150, Sell: $105
                gaming_pc: 1400, // Buy: $2000, Sell: $1400
                motorcycle: 2100 // Buy: $3000, Sell: $2100
            };

            const sellPrice = itemPrices[itemName];
            if (!sellPrice) {
                return await sock.sendMessage(from, {
                    text: `❌ *Cannot Sell*\n\nItem "${itemName}" cannot be sold or has no market value.`
                });
            }

            const totalValue = sellPrice * quantity;

            await sock.sendMessage(from, {
                text: `💰 *Confirm Sale*\n\n📦 *Item:* ${itemName}\n🔢 *Quantity:* ${quantity}\n💵 *Price per item:* ${config.economy.currency.symbol}${sellPrice.toLocaleString()}\n💰 *Total value:* ${config.economy.currency.symbol}${totalValue.toLocaleString()}\n\n⏰ Processing sale...`
            });

            setTimeout(async () => {
                try {
                    // Update inventory
                    inventoryItem.quantity -= quantity;
                    
                    // Remove item if quantity reaches 0
                    if (inventoryItem.quantity === 0) {
                        inventory.splice(itemIndex, 1);
                    }

                    // Add money
                    user.economy.balance += totalValue;

                    // Add transaction
                    user.economy.transactions.push({
                        type: 'sell',
                        amount: totalValue,
                        description: `Sold ${quantity}x ${itemName}`,
                        timestamp: new Date()
                    });

                    await updateUser(user.jid, user);

                    const itemEmojis = {
                        apple: '🍎', bread: '🍞', coffee: '☕', laptop: '💻',
                        car: '🚗', house: '🏠', diamond: '💎', gold: '🥇',
                        phone: '📱', watch: '⌚', gaming_pc: '🖥️', motorcycle: '🏍️'
                    };

                    const emoji = itemEmojis[itemName] || '📦';
                    const remainingQuantity = inventoryItem.quantity || 0;

                    const result = `✅ *Sale Successful!*\n\n${emoji} *Item:* ${itemName.charAt(0).toUpperCase() + itemName.slice(1)}\n📦 *Quantity sold:* ${quantity}\n💰 *Total earned:* ${config.economy.currency.symbol}${totalValue.toLocaleString()}\n\n📊 *Updated Stats:*\n• Remaining ${itemName}: ${remainingQuantity}\n• New balance: ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n\n⏰ *Transaction time:* ${new Date().toLocaleString()}\n💳 *Transaction ID:* ${Date.now().toString().slice(-6)}`;

                    await sock.sendMessage(from, { text: result });

                    // Bonus for large sales
                    if (totalValue >= 1000) {
                        const bonus = Math.floor(totalValue * 0.05); // 5% bonus
                        user.economy.balance += bonus;
                        
                        user.economy.transactions.push({
                            type: 'sell',
                            amount: bonus,
                            description: `Large sale bonus (${quantity}x ${itemName})`,
                            timestamp: new Date()
                        });

                        await updateUser(user.jid, user);

                        await sock.sendMessage(from, {
                            text: `🎉 *Large Sale Bonus!*\n\n💰 *Bonus:* ${config.economy.currency.symbol}${bonus.toLocaleString()} (5%)\n💵 *Final Balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n\n*Thanks for being a valued trader!*`
                        });
                    }

                } catch (error) {
                    await sock.sendMessage(from, {
                        text: '❌ *Sale Error*\n\nFailed to complete sale. Your items are safe!'
                    });
                }
            }, 2000);

        } catch (error) {
            console.error('Sell command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to process sale request.'
            });
        }
    }
};