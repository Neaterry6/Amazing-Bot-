module.exports = {
    name: 'slots',
    aliases: ['slot', 'slotmachine'],
    category: 'games',
    description: 'Play the slot machine game',
    usage: 'slots',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender }) {
        const symbols = ['🍎', '🍊', '🍋', '🍌', '🍇', '🍓', '🥝', '🍑'];
        const jackpotSymbols = ['💎', '🏆', '👑'];
        const specialSymbols = ['🔔', '⭐', '💰'];
        
        // Generate three random symbols
        const slot1 = Math.random() < 0.05 ? 
            jackpotSymbols[Math.floor(Math.random() * jackpotSymbols.length)] :
            Math.random() < 0.15 ? 
            specialSymbols[Math.floor(Math.random() * specialSymbols.length)] :
            symbols[Math.floor(Math.random() * symbols.length)];
            
        const slot2 = Math.random() < 0.05 ? 
            jackpotSymbols[Math.floor(Math.random() * jackpotSymbols.length)] :
            Math.random() < 0.15 ? 
            specialSymbols[Math.floor(Math.random() * specialSymbols.length)] :
            symbols[Math.floor(Math.random() * symbols.length)];
            
        const slot3 = Math.random() < 0.05 ? 
            jackpotSymbols[Math.floor(Math.random() * jackpotSymbols.length)] :
            Math.random() < 0.15 ? 
            specialSymbols[Math.floor(Math.random() * specialSymbols.length)] :
            symbols[Math.floor(Math.random() * symbols.length)];
        
        let result = '';
        let prize = '';
        let multiplier = 0;
        
        // Check for wins
        if (slot1 === slot2 && slot2 === slot3) {
            if (jackpotSymbols.includes(slot1)) {
                result = '🎰 **MEGA JACKPOT!** 🎰';
                prize = '1000 coins';
                multiplier = 1000;
            } else if (specialSymbols.includes(slot1)) {
                result = '🌟 **BIG WIN!** 🌟';
                prize = '500 coins';
                multiplier = 500;
            } else {
                result = '🎉 **JACKPOT!** 🎉';
                prize = '200 coins';
                multiplier = 200;
            }
        } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
            if (jackpotSymbols.some(s => [slot1, slot2, slot3].includes(s))) {
                result = '💫 **Nice Win!** 💫';
                prize = '100 coins';
                multiplier = 100;
            } else if (specialSymbols.some(s => [slot1, slot2, slot3].includes(s))) {
                result = '✨ **Small Win!** ✨';
                prize = '50 coins';
                multiplier = 50;
            } else {
                result = '🎯 **Match!** 🎯';
                prize = '25 coins';
                multiplier = 25;
            }
        } else {
            result = '❌ **No Match** ❌';
            prize = 'Better luck next time!';
            multiplier = 0;
        }
        
        // Animation effect
        await sock.sendMessage(from, {
            text: `🎰 **SLOT MACHINE** 🎰

🎲 Spinning...
┌─────────────┐
│  🎰 🎰 🎰  │
└─────────────┘`
        });
        
        // Wait a moment for effect
        setTimeout(async () => {
            const response = `🎰 **SLOT MACHINE** 🎰

🎲 **Result:**
┌─────────────┐
│  ${slot1}  ${slot2}  ${slot3}  │
└─────────────┘

${result}
🏆 **Prize:** ${prize}

🎯 **Symbol Values:**
💎👑🏆 = Mega Jackpot (1000)
🔔⭐💰 = Big Win (500)  
🍎🍊🍋 = Regular Win (200)
Two Match = 25-100 coins

🎮 Try your luck again!`;
            
            await sock.sendMessage(from, { text: response });
        }, 2000);
    }
};