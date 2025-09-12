module.exports = {
    name: 'compliment',
    aliases: ['praise', 'nice', 'complements'],
    category: 'fun',
    description: 'Give someone a genuine compliment',
    usage: 'compliment [@user]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const targetUser = mentionedUsers.length > 0 ? mentionedUsers[0] : message.key.participant || from;
            const targetName = mentionedUsers.length > 0 ? `@${targetUser.split('@')[0]}` : 'You';

            const compliments = [
                "have an amazing personality that brightens everyone's day! ✨",
                "are incredibly thoughtful and caring! 💖",
                "have such a wonderful sense of humor! 😄",
                "are really good at making others feel comfortable! 🤗",
                "have a beautiful way of seeing the world! 🌎",
                "are so creative and inspiring! 🎨",
                "have excellent taste in everything! 👌",
                "are a great listener and friend! 👂",
                "have such positive energy! ⚡",
                "are incredibly smart and wise! 🧠",
                "have a heart of gold! 💛",
                "are absolutely hilarious! 🤣",
                "have amazing problem-solving skills! 🔧",
                "are so dependable and trustworthy! 🤝",
                "have such great style! 👕",
                "are incredibly talented! 🌟",
                "always know the right thing to say! 💬",
                "have an infectious smile! 😊",
                "are so hardworking and dedicated! 💪",
                "have excellent judgment! ⚖️",
                "are a wonderful human being! 🌺",
                "have such a kind soul! 💜",
                "are absolutely adorable! 🥰",
                "have the best laugh! 😂",
                "are incredibly generous! 🎁",
                "have amazing leadership qualities! 👑",
                "are so mature and responsible! 🎯",
                "have great communication skills! 📢",
                "are incredibly supportive! 🫂",
                "have such a unique and special personality! 🦄"
            ];

            const compliment = compliments[Math.floor(Math.random() * compliments.length)];
            
            const encouragements = [
                "Keep being awesome!",
                "Never change!",
                "You're doing great!",
                "Stay amazing!",
                "Keep shining!",
                "You're incredible!",
                "Keep spreading positivity!",
                "You're a treasure!"
            ];

            const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];

            const responseText = `🌟 *GENUINE COMPLIMENT*\n\n💫 ${targetName} ${compliment}\n\n💖 *Encouragement:* ${encouragement}\n\n😊 *Remember:* You make the world a better place just by being in it!\n\n✨ _Spread kindness everywhere you go!_`;

            await sock.sendMessage(from, {
                text: responseText,
                mentions: mentionedUsers
            });

        } catch (error) {
            console.error('Compliment command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nCouldn\'t generate compliment, but you\'re still awesome! 💖'
            });
        }
    }
};