const { getUser, updateUser } = require('../../models/User');
const config = require('../../config');

module.exports = {
    name: 'transfer',
    aliases: ['send', 'give', 'pay'],
    category: 'economy',
    description: 'Transfer money to another user',
    usage: 'transfer [amount] [@user]',
    cooldown: 10,
    permissions: ['user'],
    args: true,
    minArgs: 2,

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            if (!config.economy.enabled) {
                return await sock.sendMessage(from, {
                    text: '❌ *Economy Disabled*\n\nThe economy system is currently disabled.'
                });
            }

            const amount = parseInt(args[0]);
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            if (isNaN(amount) || amount <= 0) {
                return await sock.sendMessage(from, {
                    text: `❌ *Invalid Amount*\n\nPlease specify a valid amount to transfer.\n\n*Usage:* ${prefix}transfer [amount] [@user]\n*Example:* ${prefix}transfer 100 @username`
                });
            }

            if (amount < 10) {
                return await sock.sendMessage(from, {
                    text: '❌ *Minimum Transfer*\n\nMinimum transfer amount is $10.'
                });
            }

            if (mentionedUsers.length === 0) {
                return await sock.sendMessage(from, {
                    text: `❌ *No Recipient*\n\nPlease mention a user to transfer money to.\n\n*Usage:* ${prefix}transfer [amount] [@user]\n*Example:* ${prefix}transfer 100 @username`
                });
            }

            const recipientJid = mentionedUsers[0];
            const senderJid = message.key.participant || from;

            if (recipientJid === senderJid) {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Transfer*\n\nYou cannot transfer money to yourself!'
                });
            }

            if (amount > user.economy.balance) {
                return await sock.sendMessage(from, {
                    text: `❌ *Insufficient Funds*\n\n*Transfer Amount:* ${config.economy.currency.symbol}${amount.toLocaleString()}\n*Your Balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n*Missing:* ${config.economy.currency.symbol}${(amount - user.economy.balance).toLocaleString()}\n\nEarn more money with ${prefix}work or ${prefix}daily!`
                });
            }

            // Calculate transfer fee (2% with minimum $1)
            const transferFee = Math.max(1, Math.floor(amount * 0.02));
            const totalDeduction = amount + transferFee;

            if (totalDeduction > user.economy.balance) {
                return await sock.sendMessage(from, {
                    text: `❌ *Insufficient Funds for Fee*\n\n*Transfer Amount:* ${config.economy.currency.symbol}${amount.toLocaleString()}\n*Transfer Fee (2%):* ${config.economy.currency.symbol}${transferFee.toLocaleString()}\n*Total Needed:* ${config.economy.currency.symbol}${totalDeduction.toLocaleString()}\n*Your Balance:* ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n*Missing:* ${config.economy.currency.symbol}${(totalDeduction - user.economy.balance).toLocaleString()}`
                });
            }

            // Get or create recipient user
            let recipient = await getUser(recipientJid);
            if (!recipient) {
                recipient = await updateUser(recipientJid, {
                    jid: recipientJid,
                    phone: recipientJid.split('@')[0],
                    economy: {
                        balance: config.economy.startingBalance,
                        bank: 0,
                        level: 1,
                        xp: 0,
                        rank: 'Beginner',
                        inventory: [],
                        transactions: []
                    }
                });
            }

            // Process transfer
            user.economy.balance -= totalDeduction;
            recipient.economy.balance += amount;

            // Add transactions
            user.economy.transactions.push({
                type: 'transfer',
                amount: -totalDeduction,
                description: `Sent $${amount} to @${recipientJid.split('@')[0]} (fee: $${transferFee})`,
                timestamp: new Date()
            });

            recipient.economy.transactions.push({
                type: 'transfer',
                amount: amount,
                description: `Received $${amount} from @${senderJid.split('@')[0]}`,
                timestamp: new Date()
            });

            // Save both users
            await Promise.all([
                updateUser(user.jid, user),
                updateUser(recipient.jid, recipient)
            ]);

            const senderNumber = senderJid.split('@')[0];
            const recipientNumber = recipientJid.split('@')[0];

            await sock.sendMessage(from, {
                text: `✅ *Transfer Successful!*\n\n💸 *Amount Sent:* ${config.economy.currency.symbol}${amount.toLocaleString()}\n👤 *To:* @${recipientNumber}\n💰 *Transfer Fee:* ${config.economy.currency.symbol}${transferFee.toLocaleString()} (2%)\n\n📊 *Transaction Summary:*\n• Total Deducted: ${config.economy.currency.symbol}${totalDeduction.toLocaleString()}\n• Your New Balance: ${config.economy.currency.symbol}${user.economy.balance.toLocaleString()}\n• Recipient's New Balance: ${config.economy.currency.symbol}${recipient.economy.balance.toLocaleString()}\n\n⏰ *Time:* ${new Date().toLocaleString()}\n💳 *Transaction ID:* ${Date.now().toString().slice(-6)}`,
                mentions: [recipientJid, senderJid]
            });

            // Notify recipient if in different chat
            try {
                await sock.sendMessage(recipientJid, {
                    text: `💰 *Money Received!*\n\n🎉 You received ${config.economy.currency.symbol}${amount.toLocaleString()} from @${senderNumber}!\n\n💵 *Your New Balance:* ${config.economy.currency.symbol}${recipient.economy.balance.toLocaleString()}\n⏰ *Time:* ${new Date().toLocaleString()}\n\nUse ${prefix}balance to check your money!`,
                    mentions: [senderJid]
                });
            } catch (e) {
                // User might have privacy settings
            }

        } catch (error) {
            console.error('Transfer command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Transfer Error*\n\nFailed to process transfer. Your money is safe!'
            });
        }
    }
};