module.exports = {
    name: 'dare',
    aliases: ['challenge', 'd'],
    category: 'fun',
    description: 'Get a random dare challenge',
    usage: 'dare [@user]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const targetUser = mentionedUsers.length > 0 ? mentionedUsers[0] : message.key.participant || from;
            const targetName = mentionedUsers.length > 0 ? `@${targetUser.split('@')[0]}` : 'You';

            const dares = [
                "sing a song out loud",
                "do 10 push-ups",
                "call a random contact and tell them a joke",
                "post an embarrassing photo on your status",
                "eat something spicy",
                "do a silly dance for 30 seconds",
                "speak in an accent for the next 10 minutes",
                "text your crush (if you have one)",
                "do jumping jacks for 1 minute",
                "make a funny face and send a selfie",
                "tell everyone your most embarrassing moment",
                "try to lick your elbow",
                "balance a book on your head for 2 minutes",
                "do your best impression of a celebrity",
                "eat a spoonful of a condiment",
                "call your mom and tell her you love her",
                "do the chicken dance",
                "try to touch your nose with your tongue",
                "send a voice message singing Happy Birthday",
                "do 20 sit-ups",
                "make up a rap about your day",
                "try to juggle 3 items",
                "do a cartwheel (or attempt to)",
                "speak only in questions for 5 minutes",
                "do your best animal impression",
                "eat something with your non-dominant hand",
                "give someone a genuine compliment",
                "do the moonwalk",
                "try to say the alphabet backwards",
                "make a paper airplane and fly it"
            ];

            const randomDare = dares[Math.floor(Math.random() * dares.length)];
            const difficulty = Math.floor(Math.random() * 3) + 1; // 1-3 stars
            const stars = '⭐'.repeat(difficulty);

            const responseText = `🎯 *DARE CHALLENGE*\n\n👤 *Target:* ${targetName}\n🔥 *Dare:* ${randomDare}\n${stars} *Difficulty:* ${difficulty}/3\n\n💪 *Accept the challenge?*\n⏰ *Time limit:* 5 minutes\n\n🏆 *Rules:*\n• Complete the dare safely\n• Have fun with it!\n• Share proof if possible\n• No harmful activities\n\n_Dare responsibly! 😄_`;

            await sock.sendMessage(from, {
                text: responseText,
                mentions: mentionedUsers
            });

        } catch (error) {
            console.error('Dare command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to generate dare challenge.'
            });
        }
    }
};