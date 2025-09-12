module.exports = {
    name: 'meme',
    aliases: ['memes', 'funny'],
    category: 'fun',
    description: 'Get random meme text or create meme scenarios',
    usage: 'meme [type]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const memeType = args[0]?.toLowerCase() || 'random';

            const memeTemplates = {
                drake: [
                    "Drake pointing away: Using regular commands\nDrake pointing: Using this awesome bot! 😎",
                    "Drake pointing away: Boring conversations\nDrake pointing: Fun meme commands! 🎭",
                    "Drake pointing away: Working hard\nDrake pointing: Procrastinating with memes 😅"
                ],
                distracted: [
                    "Boyfriend: You\nGirlfriend: Current chat\nOther woman: This bot's amazing commands! 👀",
                    "Boyfriend: Your attention\nGirlfriend: Important tasks\nOther woman: Playing with bot commands! 🎮"
                ],
                brain: [
                    "Small brain: Regular texting\nBig brain: Using basic commands\nGalaxy brain: Mastering all bot features! 🧠✨",
                    "Small brain: Manual work\nBig brain: Using shortcuts\nGalaxy brain: Automating everything with bots! 🤖"
                ],
                change: [
                    "Things that never change:\n• Taxes\n• Death\n• People asking 'Can you repeat that?' right after you explained something clearly 🙄",
                    "Things that never change:\n• Monday blues\n• WiFi being slow when you need it most\n• This bot being awesome! 🎉"
                ]
            };

            const reactions = [
                "😂 That moment when...",
                "🤔 Me trying to understand...", 
                "😅 When someone says...",
                "🙃 Plot twist:",
                "😎 Meanwhile:",
                "🤓 Fun fact:",
                "😵 Mind = blown when...",
                "🎭 Reality:",
                "🎪 The circus called, they want their...",
                "🎰 Odds are..."
            ];

            const scenarios = [
                "When you open the fridge for the 5th time hoping food magically appeared 🥪",
                "When WiFi stops working and you question your entire existence 📡",
                "When you say 'last episode' but Netflix auto-plays the next one 📺",
                "When you're an adult but still ask your mom where you put your stuff 👩",
                "When you pretend to be busy at work but you're actually using this bot 💼",
                "When someone asks if you're okay but you're clearly not okay 😔",
                "When you realize you've been talking to yourself for 10 minutes 🗣️",
                "When you try to be productive but social media exists 📱",
                "When you say 'I'll do it tomorrow' knowing tomorrow-you will hate today-you ⏰",
                "When you laugh at your own joke before finishing telling it 😂"
            ];

            let responseText = '';

            if (memeType === 'random' || !memeTemplates[memeType]) {
                // Random meme scenario
                const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
                
                responseText = `🎭 *MEME OF THE MOMENT*\n\n${randomReaction}\n\n${randomScenario}\n\n😄 *Relatable level:* ${Math.floor(Math.random() * 10) + 1}/10`;
                
            } else {
                // Specific meme template
                const templates = memeTemplates[memeType];
                const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
                
                responseText = `🎭 *${memeType.toUpperCase()} MEME*\n\n${randomTemplate}\n\n😂 *Classic format!*`;
            }

            responseText += `\n\n💡 *Try these types:*\n`;
            responseText += `• ${prefix}meme drake\n`;
            responseText += `• ${prefix}meme distracted\n`;
            responseText += `• ${prefix}meme brain\n`;
            responseText += `• ${prefix}meme change\n`;
            responseText += `• ${prefix}meme random\n\n`;
            responseText += `🎪 *More memes = more fun!*`;

            await sock.sendMessage(from, { text: responseText });

        } catch (error) {
            console.error('Meme command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Meme Error*\n\nThe meme generator is broken! 😱\n\n...wait, that\'s actually kind of memeable! 🤔'
            });
        }
    }
};