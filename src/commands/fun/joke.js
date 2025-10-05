export default {
    name: 'joke',
    aliases: ['j', 'funny'],
    category: 'fun',
    description: 'Get a random joke',
    usage: 'joke',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, sender }) {
        const jokes = [
            { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything!" },
            { setup: "What do you call a fake noodle?", punchline: "An impasta!" },
            { setup: "Why did the scarecrow win an award?", punchline: "He was outstanding in his field!" },
            { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear!" },
            { setup: "Why did the coffee file a police report?", punchline: "It got mugged!" },
            { setup: "How do you organize a space party?", punchline: "You planet!" },
            { setup: "What's orange and sounds like a parrot?", punchline: "A carrot!" },
            { setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up!" },
            { setup: "What do you call a sleeping bull?", punchline: "A bulldozer!" },
            { setup: "Why did the bicycle fall over?", punchline: "It was two tired!" },
            { setup: "What did the ocean say to the beach?", punchline: "Nothing, it just waved!" },
            { setup: "Why can't your nose be 12 inches long?", punchline: "Because then it would be a foot!" },
            { setup: "What do you call a fish wearing a bowtie?", punchline: "Sofishticated!" },
            { setup: "Why did the math book look sad?", punchline: "Because it had too many problems!" },
            { setup: "What's the best time to go to the dentist?", punchline: "Tooth-hurty!" }
        ];

        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        
        const responseText = `╭──⦿【 😂 RANDOM JOKE 】
╰────────⦿

╭──⦿【 🎭 SETUP 】
│ ${randomJoke.setup}
╰────────⦿

╭──⦿【 💥 PUNCHLINE 】
│ ${randomJoke.punchline}
╰────────⦿

╭─────────────⦿
│ 😄 Hope that made you smile!
│ 🎪 Want another? Type .joke
╰────────────⦿`;

        await sock.sendMessage(from, { 
            text: responseText 
        }, { quoted: message });
    }
};