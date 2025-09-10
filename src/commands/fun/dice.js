module.exports = {
    name: 'dice',
    aliases: ['roll', 'd6'],
    category: 'fun',
    description: 'Roll a dice (1-6)',
    usage: 'dice [sides]',
    cooldown: 2,
    permissions: ['user'],

    async execute(sock, message, args) {
        const sides = parseInt(args[0]) || 6;
        
        if (sides < 2 || sides > 100) {
            return sock.sendMessage(message.key.remoteJid, {
                text: '❌ Please enter a valid number of sides (2-100)'
            });
        }

        const result = Math.floor(Math.random() * sides) + 1;
        
        const diceEmojis = {
            1: '⚀',
            2: '⚁', 
            3: '⚂',
            4: '⚃',
            5: '⚄',
            6: '⚅'
        };

        const emoji = diceEmojis[result] || '🎲';
        
        const responseText = `🎲 *Dice Roll*

${emoji} You rolled: *${result}*
🎯 Out of ${sides} sides`;

        await sock.sendMessage(message.key.remoteJid, { text: responseText });
    }
};