export default {
    name: 'quote',
    aliases: ['quotes', 'inspiration', 'wisdom'],
    category: 'fun',
    description: 'Get an inspirational or funny quote',
    usage: 'quote [type]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const quoteType = args[0]?.toLowerCase() || 'random';

            const quotes = {
                motivational: [
                    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
                    { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
                    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
                    { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
                    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
                    { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
                    { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
                    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
                ],
                funny: [
                    { text: "I haven't failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
                    { text: "I'm not superstitious, but I am a little stitious.", author: "Michael Scott" },
                    { text: "The trouble with having an open mind is that people keep coming along and sticking things into it.", author: "Terry Pratchett" },
                    { text: "I can resist everything except temptation.", author: "Oscar Wilde" },
                    { text: "A day without sunshine is like, you know, night.", author: "Steve Martin" },
                    { text: "The early bird might get the worm, but the second mouse gets the cheese.", author: "Anonymous" },
                    { text: "I'm writing a book. I've got the page numbers done.", author: "Steven Wright" },
                    { text: "Weather forecast for tonight: dark.", author: "George Carlin" }
                ],
                success: [
                    { text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
                    { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
                    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
                    { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
                    { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
                    { text: "Success is not in what you have, but who you are.", author: "Bo Bennett" }
                ],
                wisdom: [
                    { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
                    { text: "Yesterday is history, tomorrow is a mystery, today is a gift.", author: "Eleanor Roosevelt" },
                    { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
                    { text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.", author: "Albert Einstein" },
                    { text: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero" },
                    { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" }
                ]
            };

            let selectedQuotes;
            let categoryName;

            if (quoteType === 'random' || !quotes[quoteType]) {
                // Random quote from any category
                const allQuotes = Object.values(quotes).flat();
                selectedQuotes = allQuotes;
                categoryName = 'Random';
            } else {
                selectedQuotes = quotes[quoteType];
                categoryName = quoteType.charAt(0).toUpperCase() + quoteType.slice(1);
            }

            const randomQuote = selectedQuotes[Math.floor(Math.random() * selectedQuotes.length)];

            const emojis = {
                motivational: '💪',
                funny: '😂',
                success: '🏆',
                wisdom: '🧠',
                random: '✨'
            };

            const emoji = emojis[quoteType] || emojis.random;

            let responseText = `${emoji} *${categoryName.toUpperCase()} QUOTE*\n\n`;
            responseText += `💭 "${randomQuote.text}"\n\n`;
            responseText += `👤 *— ${randomQuote.author}*\n\n`;

            // Add a random inspirational element
            const inspirations = [
                "🌟 Let this inspire your day!",
                "💡 Food for thought!",
                "🚀 Fuel for your journey!",
                "🌈 Words to live by!",
                "⭐ Wisdom worth sharing!",
                "🎯 Something to reflect on!",
                "💫 Daily dose of inspiration!",
                "🌸 Gentle reminder from the universe!"
            ];

            const randomInspiration = inspirations[Math.floor(Math.random() * inspirations.length)];
            responseText += randomInspiration;

            responseText += `\n\n💡 *Try these types:*\n`;
            responseText += `• ${prefix}quote motivational\n`;
            responseText += `• ${prefix}quote funny\n`;
            responseText += `• ${prefix}quote success\n`;
            responseText += `• ${prefix}quote wisdom\n`;
            responseText += `• ${prefix}quote random`;

            await sock.sendMessage(from, { text: responseText });

        } catch (error) {
            console.error('Quote command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Quote Error*\n\n💭 "The only failure is not trying at all."\n\n— Bot trying to be inspirational despite the error 😅'
            });
        }
    }
};