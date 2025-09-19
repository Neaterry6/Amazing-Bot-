import config from '../../config.js';
import { getUser, updateUser  } from '../../models/User.js';




export default {
    name: 'buy',
    aliases: ['purchase', 'buyitem'],
    category: 'economy',
    description: 'Buy items from the shop',
    usage: 'buy [item] [quantity]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            if (!config.economy.enabled) {
                return await sock.sendMessage(from, {
                    text: '❌ *Economy Disabled*\n\nThe economy system is currently disabled.'
                });
            }

            if (args.length === 0) {
                return await sock.sendMessage(from, {
                    text: `🛒 *Shop - Buy Items*\n\n*Usage:* ${prefix}buy [item] [quantity]\n\n*Available Items:*\n• apple - 🍎 $10\n• bread - 🍞 $15\n• coffee - ☕ $25\n• laptop - 💻 $500\n• car - 🚗 $5000\n• house - 🏠 $50000\n• diamond - 💎 $1000\n• gold - 🥇 $800\n\n*Examples:*\n• ${prefix}buy apple 5\n• ${prefix}buy laptop 1\n• ${prefix}shop - View full shop`
                });
            }

            const itemName = args[0].toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (quantity <= 0 || quantity > 100) {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Quantity*\n\nQuantity must be between 1 and 100.'
                });
            }

            const shopItems = {
                apple: { name: '🍎 Apple', price: 10, description: 'A fresh red apple' },
                bread: { name: '🍞 Bread', price: 15, description: 'Freshly baked bread' },
                coffee: { name: '☕ Coffee', price: 25, description: 'Premium coffee beans' },
                laptop: { name: '💻 Laptop', price: 500, description: 'High-performance laptop' },
                car: { name: '🚗 Car', price: 5000, description: 'Fast sports car' },
                house: { name: '🏠 House', price: 50000, description: 'Beautiful mansion' },
                diamond: { name: '💎 Diamond', price: 1000, description: 'Rare precious diamond' },
                gold: { name: '🥇 Gold', price: 800, description: 'Pure gold bar' }
            };

            const item = shopItems[itemName];
            if (!item) {
                return await sock.sendMessage(from, {
                    text: `❌ *Item Not Found*\n\nItem "${itemName}" is not available in the shop.\n\nUse ${prefix}shop to see available items.`
                });
            }

            const totalCost = item.price * quantity;
            
            if (user.economy.balance < totalCost) {
                return await sock.sendMessage(from, {
                    text: `❌ *Insufficient Funds*\n\n*Item:* ${item.name}\n*Quantity:* ${quantity}\n*Total Cost:* ${config.economy.currency.symbol}${totalCost.toLocaleString()}\n*Your Balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n*Missing:* ${config.economy.currency.symbol}${(totalCost - user.economy.balance).toLocaleString()}\n\nEarn more money with ${prefix}work or ${prefix}daily!`
                });
            }

            // Check if user already has this item
            const existingItem = user.economy.inventory.find(inv => inv.item === itemName);
            
            if (existingItem) {
                existingItem.quantity += quantity;
                existingItem.purchasedAt = new Date();
            } else {
                user.economy.inventory.push({
                    item: itemName,
                    quantity: quantity,
                    purchasedAt: new Date()
                });
            }

            // Deduct money and add transaction
            user.economy.balance -= totalCost;
            user.economy.transactions.push({
                type: 'purchase',
                amount: -totalCost,
                description: `Bought ${quantity}x ${item.name}`,
                timestamp: new Date()
            });

            await updateUser(user.jid, user);

            await sock.sendMessage(from, {
                text: `✅ *Purchase Successful!*\n\n🛒 *Item:* ${item.name}\n📦 *Quantity:* ${quantity}\n💰 *Cost:* ${config.economy.currency.symbol}${totalCost.toLocaleString()}\n\n💵 *Remaining Balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n\n*Description:* ${item.description}\n\nUse ${prefix}inventory to view your items!`
            });

        } catch (error) {
            console.error('Buy command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Purchase Error*\n\nFailed to complete purchase. Please try again.'
            });
        }
    }
};