export default {
    name: '8ball',
    aliases: ['8b', 'eightball'],
    category: 'fun',
    description: 'Ask the magic 8-ball a question',
    usage: '8ball <question>',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const question = args.join(' ');
        
        const answers = [
            { text: "It is certain", emoji: "✅", type: "positive" },
            { text: "Without a doubt", emoji: "💯", type: "positive" },
            { text: "Yes definitely", emoji: "✨", type: "positive" },
            { text: "You may rely on it", emoji: "🎯", type: "positive" },
            { text: "As I see it, yes", emoji: "👁️", type: "positive" },
            { text: "Most likely", emoji: "📈", type: "positive" },
            { text: "Outlook good", emoji: "🌟", type: "positive" },
            { text: "Signs point to yes", emoji: "☝️", type: "positive" },
            { text: "Reply hazy, try again", emoji: "🌫️", type: "neutral" },
            { text: "Ask again later", emoji: "⏰", type: "neutral" },
            { text: "Better not tell you now", emoji: "🤐", type: "neutral" },
            { text: "Cannot predict now", emoji: "🔮", type: "neutral" },
            { text: "Concentrate and ask again", emoji: "🧘", type: "neutral" },
            { text: "Don't count on it", emoji: "❌", type: "negative" },
            { text: "My reply is no", emoji: "🚫", type: "negative" },
            { text: "My sources say no", emoji: "📰", type: "negative" },
            { text: "Outlook not so good", emoji: "📉", type: "negative" },
            { text: "Very doubtful", emoji: "🤔", type: "negative" }
        ];

        const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
        
        const typeEmojis = {
            positive: "🟢",
            neutral: "🟡",
            negative: "🔴"
        };

        const responseText = `╭──⦿【 🔮 MAGIC 8-BALL 】
╰────────⦿

╭──⦿【 ❓ YOUR QUESTION 】
│ ${question}
╰────────⦿

╭──⦿【 ✨ THE ANSWER 】
│ ${typeEmojis[randomAnswer.type]} ${randomAnswer.emoji} ${randomAnswer.text}
╰────────⦿

╭─────────────⦿
│ 🎱 The 8-Ball has spoken!
│ 🔄 Ask again for new wisdom
╰────────────⦿`;

        await sock.sendMessage(from, { 
            text: responseText 
        }, { quoted: message });
    }
};