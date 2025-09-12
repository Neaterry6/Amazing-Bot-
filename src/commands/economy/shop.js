const config = require('../../config');

module.exports = {
    name: 'shop',
    aliases: ['store', 'market', 'buy'],
    category: 'economy',
    description: 'View the shop and available items',
    usage: 'shop [page]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            if (!config.economy.enabled) {
                return await sock.sendMessage(from, {
                    text: '❌ *Economy Disabled*\n\nThe economy system is currently disabled.'
                });
            }

            const page = parseInt(args[0]) || 1;
            const itemsPerPage = 6;

            const shopItems = [
                { id: 'apple', name: '🍎 Apple', price: 10, description: 'A fresh red apple - restores 5 HP', category: 'Food' },
                { id: 'bread', name: '🍞 Bread', price: 15, description: 'Freshly baked bread - restores 8 HP', category: 'Food' },
                { id: 'coffee', name: '☕ Coffee', price: 25, description: 'Premium coffee - boosts work earnings by 10%', category: 'Consumable' },
                { id: 'laptop', name: '💻 Laptop', price: 500, description: 'High-performance laptop - increases work success rate', category: 'Electronics' },
                { id: 'car', name: '🚗 Car', price: 5000, description: 'Fast sports car - reduces work cooldown by 25%', category: 'Vehicle' },
                { id: 'house', name: '🏠 House', price: 50000, description: 'Beautiful mansion - passive income $50/hour', category: 'Property' },
                { id: 'diamond', name: '💎 Diamond', price: 1000, description: 'Rare precious diamond - can be sold for profit', category: 'Jewelry' },
                { id: 'gold', name: '🥇 Gold', price: 800, description: 'Pure gold bar - stable investment item', category: 'Precious Metal' },
                { id: 'phone', name: '📱 Phone', price: 300, description: 'Smartphone - enables mobile banking features', category: 'Electronics' },
                { id: 'watch', name: '⌚ Watch', price: 150, description: 'Luxury watch - shows exact work cooldown time', category: 'Accessory' },
                { id: 'gaming_pc', name: '🖥️ Gaming PC', price: 2000, description: 'Powerful gaming setup - unlocks gaming commands', category: 'Electronics' },
                { id: 'motorcycle', name: '🏍️ Motorcycle', price: 3000, description: 'Fast motorcycle - quick travel and style points', category: 'Vehicle' }
            ];

            const totalPages = Math.ceil(shopItems.length / itemsPerPage);
            
            if (page < 1 || page > totalPages) {
                return await sock.sendMessage(from, {
                    text: `❌ *Invalid Page*\n\nPage must be between 1 and ${totalPages}.\n\nUse ${prefix}shop [page] to navigate.`
                });
            }

            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageItems = shopItems.slice(startIndex, endIndex);

            let shopText = `🛒 *Economy Shop* - Page ${page}/${totalPages}\n\n`;
            shopText += `💰 *Your Balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n\n`;

            pageItems.forEach((item, index) => {
                const itemNumber = startIndex + index + 1;
                shopText += `${itemNumber}. ${item.name}\n`;
                shopText += `   💰 *Price:* ${config.economy.currency.symbol}${item.price.toLocaleString()}\n`;
                shopText += `   📁 *Category:* ${item.category}\n`;
                shopText += `   📝 *Effect:* ${item.description}\n`;
                shopText += `   🛒 *Buy:* ${prefix}buy ${item.id} [quantity]\n\n`;
            });

            shopText += `📄 *Navigation:*\n`;
            if (page > 1) shopText += `• ${prefix}shop ${page - 1} - Previous page\n`;
            if (page < totalPages) shopText += `• ${prefix}shop ${page + 1} - Next page\n`;
            shopText += `• ${prefix}shop 1 - First page\n\n`;

            shopText += `💡 *Quick Commands:*\n`;
            shopText += `• ${prefix}buy [item] [qty] - Purchase item\n`;
            shopText += `• ${prefix}inventory - View your items\n`;
            shopText += `• ${prefix}sell [item] [qty] - Sell items\n`;
            shopText += `• ${prefix}balance - Check your money\n\n`;

            shopText += `🏪 *Shop Features:*\n`;
            shopText += `• 📦 ${shopItems.length} different items\n`;
            shopText += `• 🔄 Items provide various benefits\n`;
            shopText += `• 💎 Rare items available\n`;
            shopText += `• 📈 Investment opportunities\n\n`;

            shopText += `_💰 Earn money with ${prefix}work, ${prefix}daily, ${prefix}weekly!_`;

            await sock.sendMessage(from, { text: shopText });

        } catch (error) {
            console.error('Shop command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to load shop.'
            });
        }
    }
};