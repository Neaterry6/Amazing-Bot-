export default {
    name: 'dice',
    aliases: ['roll', 'd6'],
    category: 'fun',
    description: 'Roll a dice (1-6)',
    usage: 'dice [sides]',
    cooldown: 2,
    permissions: ['user'],

    async execute({ sock, message, args, from }) {
        const sides = parseInt(args[0]) || 6;
        
        if (sides < 2 || sides > 100) {
            return sock.sendMessage(from, {
                text: `╭──⦿【 ❌ INVALID INPUT 】
│ Please enter 2-100 sides
╰────────⦿`
            }, { quoted: message });
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
        const percentage = ((result / sides) * 100).toFixed(1);
        
        const responseText = `╭──⦿【 🎲 DICE ROLL 】
╰────────⦿

╭──⦿【 ${emoji} RESULT 】
│ 🎯 𝗥𝗼𝗹𝗹𝗲𝗱: ${result}
│ 🎲 𝗦𝗶𝗱𝗲𝘀: ${sides}
│ 📊 𝗣𝗲𝗿𝗰𝗲𝗻𝘁: ${percentage}%
╰────────⦿

╭─────────────⦿
│ 🔄 Roll again for new luck!
╰────────────⦿`;

        await sock.sendMessage(from, { 
            text: responseText 
        }, { quoted: message });
    }
};