export default {
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

            let responseText;
            
            if (bet && validBets.includes(bet)) {
                const userBet = bet === 'h' ? 'heads' : bet === 't' ? 'tails' : bet;
                const won = userBet === result;
                
                responseText = `╭──⦿【 🪙 COIN FLIP 】
╰────────⦿

╭──⦿【 🎯 YOUR BET 】
│ ${userBet.toUpperCase()}
╰────────⦿

╭──⦿【 ${coinEmojis[result]} RESULT 】
│ ${result.toUpperCase()}
╰────────⦿

╭──⦿【 ${won ? '🎉 YOU WON' : '💔 YOU LOST'} 】
│ ${won ? '✅ Correct prediction!' : '❌ Wrong prediction!'}
│ ${won ? '🏆 Victory!' : '🔄 Try again!'}
│ 📊 𝗢𝗱𝗱𝘀: 50/50
╰────────⦿

╭─────────────⦿
│ 🪙 Flip landed perfectly!
╰────────────⦿`;
                
            } else {
                responseText = `╭──⦿【 🪙 COIN FLIP 】
╰────────⦿

╭──⦿【 ${coinEmojis[result]} RESULT 】
│ ${result.toUpperCase()}
╰────────⦿

╭──⦿【 💡 HOW TO BET 】
│ ✧ ${prefix}flip heads
│ ✧ ${prefix}flip tails
│ ✧ ${prefix}flip h
│ ✧ ${prefix}flip t
╰────────⦿

╭─────────────⦿
│ 🎲 Make a bet, test your luck!
╰────────────⦿`;
            }

            await sock.sendMessage(from, { 
                text: responseText 
            }, { quoted: message });

        } catch (error) {
            console.error('Flip command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to flip coin. The coin got stuck! 🪙'
            });
        }
    }
};