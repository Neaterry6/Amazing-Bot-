const { getUser } = require('../../models/User');
const config = require('../../config');

module.exports = {
    name: 'inventory',
    aliases: ['inv', 'items', 'bag'],
    category: 'economy',
    description: 'View your inventory and items',
    usage: 'inventory [@user]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            if (!config.economy.enabled) {
                return await sock.sendMessage(from, {
                    text: '❌ *Economy Disabled*\n\nThe economy system is currently disabled.'
                });
            }

            let targetUser = user;
            let targetName = 'Your';

            // Check if viewing another user's inventory
            if (args.length > 0 && args[0].includes('@')) {
                const targetJid = args[0].replace('@', '') + '@s.whatsapp.net';
                targetUser = await getUser(targetJid);
                if (targetUser) {
                    targetName = `@${targetJid.split('@')[0]}'s`;
                } else {
                    return await sock.sendMessage(from, {
                        text: '❌ *User Not Found*\n\nThis user is not registered in the economy system.'
                    });
                }
            }

            const inventory = targetUser.economy.inventory || [];

            if (inventory.length === 0) {
                return await sock.sendMessage(from, {
                    text: `📦 *${targetName} Inventory*\n\n❌ *Empty Inventory*\n\nNo items found in inventory.\n\n💡 *How to get items:*\n• ${prefix}shop - View available items\n• ${prefix}buy [item] - Purchase items\n• ${prefix}work - Earn money for items\n• ${prefix}daily - Get daily rewards`
                });
            }

            // Calculate total inventory value
            const itemPrices = {
                apple: 10, bread: 15, coffee: 25, laptop: 500,
                car: 5000, house: 50000, diamond: 1000, gold: 800
            };

            let totalValue = 0;
            let inventoryText = `📦 *${targetName} Inventory*\n\n`;

            const itemEmojis = {
                apple: '🍎', bread: '🍞', coffee: '☕', laptop: '💻',
                car: '🚗', house: '🏠', diamond: '💎', gold: '🥇'
            };

            inventory.forEach((item, index) => {
                const emoji = itemEmojis[item.item] || '📦';
                const price = itemPrices[item.item] || 0;
                const itemValue = price * item.quantity;
                totalValue += itemValue;

                const purchaseDate = new Date(item.purchasedAt).toLocaleDateString();
                
                inventoryText += `${index + 1}. ${emoji} *${item.item.charAt(0).toUpperCase() + item.item.slice(1)}*\n`;
                inventoryText += `   • Quantity: ${item.quantity}\n`;
                inventoryText += `   • Value: ${config.economy.currency.symbol}${itemValue.toLocaleString()}\n`;
                inventoryText += `   • Purchased: ${purchaseDate}\n\n`;
            });

            inventoryText += `💰 *Total Value:* ${config.economy.currency.symbol}${totalValue.toLocaleString()}\n`;
            inventoryText += `📊 *Item Types:* ${inventory.length}\n`;
            inventoryText += `📦 *Total Items:* ${inventory.reduce((sum, item) => sum + item.quantity, 0)}\n\n`;
            inventoryText += `*Commands:*\n`;
            inventoryText += `• ${prefix}sell [item] [qty] - Sell items\n`;
            inventoryText += `• ${prefix}buy [item] [qty] - Buy more items\n`;
            inventoryText += `• ${prefix}shop - View shop\n`;
            inventoryText += `• ${prefix}transfer [amount] [@user] - Send money`;

            await sock.sendMessage(from, {
                text: inventoryText,
                mentions: targetUser !== user ? [targetUser.jid] : []
            });

        } catch (error) {
            console.error('Inventory command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to load inventory.'
            });
        }
    }
};