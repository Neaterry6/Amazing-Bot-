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

    async execute({ sock, message, args, from, sender, prefix }) {
        const choices = ['rock', 'paper', 'scissors'];
        const userChoice = args[0].toLowerCase();
        
        if (!choices.includes(userChoice)) {
            return sock.sendMessage(from, {
                text: `╭──⦿【 ❌ INVALID CHOICE 】
│ 
│ 𝗣𝗹𝗲𝗮𝘀𝗲 𝗰𝗵𝗼𝗼𝘀𝗲 𝗼𝗻𝗲:
│ ✧ 🪨 rock
│ ✧ 📄 paper
│ ✧ ✂️ scissors
│ 
│ 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: ${prefix}rps rock
╰────────⦿`
            }, { quoted: message });
        }
        
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
        let result;
        let resultEmoji;
        let points;
        
        if (userChoice === botChoice) {
            result = "IT'S A TIE!";
            resultEmoji = "🤝";
            points = 0;
        } else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) {
            result = "YOU WIN!";
            resultEmoji = "🎉";
            points = 10;
        } else {
            result = "BOT WINS!";
            resultEmoji = "🤖";
            points = -5;
        }
        
        const choiceEmojis = {
            rock: '🪨',
            paper: '📄',
            scissors: '✂️'
        };
        
        const response = `╭──⦿【 🎮 ROCK PAPER SCISSORS 】
╰────────⦿

╭──⦿【 ⚔️ BATTLE RESULT 】
│ 👤 𝗬𝗼𝘂𝗿 𝗖𝗵𝗼𝗶𝗰𝗲: ${choiceEmojis[userChoice]} ${userChoice.toUpperCase()}
│ 🤖 𝗕𝗼𝘁 𝗖𝗵𝗼𝗶𝗰𝗲: ${choiceEmojis[botChoice]} ${botChoice.toUpperCase()}
╰────────⦿

╭──⦿【 ${resultEmoji} OUTCOME 】
│ 🏆 𝗥𝗲𝘀𝘂𝗹𝘁: ${result}
│ 💎 𝗣𝗼𝗶𝗻𝘁𝘀: ${points > 0 ? '+' : ''}${points}
╰────────⦿

╭──⦿【 📖 GAME RULES 】
│ ✧ 🪨 Rock beats Scissors
│ ✧ 📄 Paper beats Rock
│ ✧ ✂️ Scissors beats Paper
╰────────⦿

╭─────────────⦿
│💫 | [ Play Again! 🎮 ]
╰────────────⦿`;

        await sock.sendMessage(from, { 
            text: response 
        }, { quoted: message });
    }
};