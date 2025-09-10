module.exports = {
    name: '8ball',
    aliases: ['8b', 'eightball'],
    category: 'fun',
    description: 'Ask the magic 8-ball a question',
    usage: '8ball <question>',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute(sock, message, args) {
        const question = args.join(' ');
        
        const responses = [
            'It is certain',
            'Without a doubt',
            'Yes definitely',
            'You may rely on it',
            'As I see it, yes',
            'Most likely',
            'Outlook good',
            'Yes',
            'Signs point to yes',
            'Reply hazy, try again',
            'Ask again later',
            'Better not tell you now',
            'Cannot predict now',
            'Concentrate and ask again',
            "Don't count on it",
            'My reply is no',
            'My sources say no',
            'Outlook not so good',
            'Very doubtful',
            'No way'
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const responseText = `🎱 *Magic 8-Ball*

❓ *Question:* ${question}

🔮 *Answer:* ${randomResponse}`;

        await sock.sendMessage(message.key.remoteJid, { text: responseText });
    }
};