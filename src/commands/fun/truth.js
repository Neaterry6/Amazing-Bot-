export default {
    name: 'truth',
    aliases: ['truthordare', 'question', 't'],
    category: 'fun',
    description: 'Get a truth question for truth or dare games',
    usage: 'truth [@user]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const targetUser = mentionedUsers.length > 0 ? mentionedUsers[0] : message.key.participant || from;
            const targetName = mentionedUsers.length > 0 ? `@${targetUser.split('@')[0]}` : 'You';

            const truthQuestions = [
                "What's the most embarrassing thing you've ever done?",
                "What's your biggest fear?",
                "What's the weirdest thing you've ever eaten?",
                "What's your most embarrassing childhood memory?",
                "What's the last lie you told?",
                "What's your biggest secret that you've never told anyone?",
                "What's the most childish thing you still do?",
                "What's your worst habit?",
                "What's the most trouble you've ever been in?",
                "What's your biggest regret?",
                "What's the silliest thing you're afraid of?",
                "What's the most awkward thing that's happened to you on a date?",
                "What's your most useless talent?",
                "What's the weirdest dream you've ever had?",
                "What's something you've never told your parents?",
                "What's your most embarrassing moment in school?",
                "What's the worst gift you've ever received?",
                "What's your guilty pleasure?",
                "What's the most expensive thing you've broken?",
                "What's your weirdest habit?",
                "What's something you believed as a child that was completely wrong?",
                "What's the most cringe thing you've done to get someone's attention?",
                "What's your biggest pet peeve?",
                "What's the worst haircut you've ever had?",
                "What's something you're glad your family doesn't know about you?",
                "What's the most ridiculous thing you've convinced someone to believe?",
                "What's your most irrational fear?",
                "What's the weirdest thing you've done when you were alone?",
                "What's your most embarrassing autocorrect fail?",
                "What's the strangest thing you've ever googled?"
            ];

            const truthQuestion = truthQuestions[Math.floor(Math.random() * truthQuestions.length)];
            const intensity = Math.floor(Math.random() * 3) + 1; // 1-3 levels
            const intensityEmojis = { 1: '😊 Easy', 2: '😬 Medium', 3: '🔥 Spicy' };

            const responseText = `🤔 *TRUTH QUESTION*\n\n🎯 *For:* ${targetName}\n${intensityEmojis[intensity]} *Intensity:* ${intensity}/3\n\n❓ *Question:*\n"${truthQuestion}"\n\n⏰ *Time to answer:* 30 seconds\n\n💡 *Rules:*\n• Be honest! 🤝\n• Keep it appropriate 👍\n• Have fun with it! 😄\n• Respect boundaries 🛡️\n\n🎭 *Remember:* The best truths come from the heart! ❤️`;

            await sock.sendMessage(from, {
                text: responseText,
                mentions: mentionedUsers
            });

            // Optional: Send a follow-up after some time
            setTimeout(async () => {
                const followUps = [
                    "Time's up! Did you answer honestly? 🤔",
                    "Hope that question wasn't too spicy! 🌶️",
                    "Truth sessions build stronger friendships! 💪",
                    "Ready for another round? 🎯"
                ];

                const randomFollowUp = followUps[Math.floor(Math.random() * followUps.length)];
                
                try {
                    await sock.sendMessage(from, {
                        text: `💭 *Truth Follow-up*\n\n${randomFollowUp}\n\n🎮 *Want more?*\n• ${prefix}truth - Another truth question\n• ${prefix}dare - Try a dare instead\n\n😊 Keep the fun going!`
                    });
                } catch (e) {
                    // Silent fail for follow-up
                }
            }, 35000); // 35 seconds

        } catch (error) {
            console.error('Truth command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Truth Error*\n\n🤫 The truth is... there was an error! 😅\n\nIronically, that\'s the most honest answer right now! 🤔'
            });
        }
    }
};