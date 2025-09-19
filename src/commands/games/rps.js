export default {
    name: 'rps',
    aliases: ['rockpaperscissors', 'rock'],
    category: 'games',
    description: 'Play Rock, Paper, Scissors against the bot',
    usage: 'rps <rock/paper/scissors>',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const choices = ['rock', 'paper', 'scissors'];
        const userChoice = args[0].toLowerCase();
        
        if (!choices.includes(userChoice)) {
            return sock.sendMessage(from, {
                text: `❌ *Invalid Choice*\n\nPlease choose one of:\n🪨 rock\n📄 paper\n✂️ scissors\n\n*Example:* rps rock`
            });
        }
        
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
        let result;
        let resultEmoji;
        
        if (userChoice === botChoice) {
            result = "It's a tie!";
            resultEmoji = "🤝";
        } else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) {
            result = "You win!";
            resultEmoji = "🎉";
        } else {
            result = "Bot wins!";
            resultEmoji = "🤖";
        }
        
        const choiceEmojis = {
            rock: '🪨',
            paper: '📄',
            scissors: '✂️'
        };
        
        const response = `🎮 *Rock Paper Scissors*

👤 **Your choice:** ${choiceEmojis[userChoice]} ${userChoice}
🤖 **Bot choice:** ${choiceEmojis[botChoice]} ${botChoice}

${resultEmoji} **Result:** ${result}

📊 *Game Rules:*
• Rock beats Scissors
• Paper beats Rock  
• Scissors beats Paper`;

        await sock.sendMessage(from, { text: response });
    }
};