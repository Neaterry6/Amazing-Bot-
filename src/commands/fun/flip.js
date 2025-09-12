module.exports = {
    name: 'flip',
    aliases: ['coin', 'coinflip', 'heads'],
    category: 'fun',
    description: 'Flip a coin (heads or tails)',
    usage: 'flip [bet]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const bet = args[0]?.toLowerCase();
            const validBets = ['heads', 'tails', 'h', 't'];
            
            // Flip the coin
            const results = ['heads', 'tails'];
            const result = results[Math.floor(Math.random() * results.length)];
            
            const coinEmojis = {
                heads: '👑',
                tails: '🎯'
            };

            let responseText = `🪙 *COIN FLIP*\n\n`;
            
            if (bet && validBets.includes(bet)) {
                const userBet = bet === 'h' ? 'heads' : bet === 't' ? 'tails' : bet;
                const won = userBet === result;
                
                responseText += `🎯 *Your bet:* ${userBet.charAt(0).toUpperCase() + userBet.slice(1)}\n`;
                responseText += `${coinEmojis[result]} *Result:* ${result.charAt(0).toUpperCase() + result.slice(1)}\n\n`;
                
                if (won) {
                    responseText += `🎉 *YOU WON!* 🎉\n`;
                    responseText += `✅ Correct prediction!\n`;
                    responseText += `🏆 Victory dance time! 💃\n`;
                } else {
                    responseText += `💔 *YOU LOST!* 💔\n`;
                    responseText += `❌ Wrong prediction!\n`;
                    responseText += `🔄 Better luck next time!\n`;
                }
                
                responseText += `\n📊 *Odds:* 50/50`;
                
            } else {
                responseText += `${coinEmojis[result]} *Result:* ${result.charAt(0).toUpperCase() + result.slice(1)}\n\n`;
                responseText += `💡 *Next time try:*\n`;
                responseText += `• ${prefix}flip heads\n`;
                responseText += `• ${prefix}flip tails\n`;
                responseText += `• ${prefix}flip h (short for heads)\n`;
                responseText += `• ${prefix}flip t (short for tails)\n\n`;
                responseText += `🎲 *Make a bet and test your luck!*`;
            }
            
            // Add some fun reactions
            const reactions = [
                "\n\n🪙 *The coin spins in the air...*",
                "\n\n✨ *Gravity does its magic...*", 
                "\n\n🎪 *The crowd holds their breath...*",
                "\n\n🎭 *Fate has been decided!*"
            ];
            
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            responseText += randomReaction;

            await sock.sendMessage(from, { text: responseText });

        } catch (error) {
            console.error('Flip command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to flip coin. The coin got stuck! 🪙'
            });
        }
    }
};