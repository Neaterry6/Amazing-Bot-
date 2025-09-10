module.exports = {
    name: 'joke',
    aliases: ['j', 'funny'],
    category: 'fun',
    description: 'Get a random joke',
    usage: 'joke',
    cooldown: 3,
    permissions: ['user'],

    async execute(sock, message, args) {
        const jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "I told my wife she was drawing her eyebrows too high. She looked surprised.",
            "Why don't eggs tell jokes? They'd crack each other up!",
            "I invented a new word: Plagiarism!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
            "I only know 25 letters of the alphabet. I don't know y.",
            "What do you call a fake noodle? An impasta!",
            "Why did the math book look so sad? Because it had too many problems!",
            "What do you call a bear with no teeth? A gummy bear!",
            "Why don't some couples go to the gym? Because some relationships don't work out!",
            "What did one wall say to the other wall? I'll meet you at the corner!",
            "Why don't scientists trust atoms? Because they make up everything!",
            "What's orange and sounds like a parrot? A carrot!",
            "How do you organize a space party? You planet!",
            "Why did the coffee file a police report? It got mugged!"
        ];

        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        
        const responseText = `😂 *Random Joke*

${randomJoke}

😄 Hope that made you smile!`;

        await sock.sendMessage(message.key.remoteJid, { text: responseText });
    }
};