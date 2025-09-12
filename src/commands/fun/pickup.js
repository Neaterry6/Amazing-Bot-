module.exports = {
    name: 'pickup',
    aliases: ['pickupline', 'flirt', 'rizz'],
    category: 'fun',
    description: 'Get a random pickup line (just for fun!)',
    usage: 'pickup [@user]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const targetUser = mentionedUsers.length > 0 ? mentionedUsers[0] : null;
            const targetName = targetUser ? `@${targetUser.split('@')[0]}` : 'someone special';

            const pickupLines = [
                "Are you WiFi? Because I'm feeling a connection! 📶",
                "Are you a magician? Because whenever I look at you, everyone else disappears! 🎩✨",
                "Do you have a map? I keep getting lost in your eyes! 🗺️👀",
                "Are you a parking ticket? Because you've got 'FINE' written all over you! 🎫",
                "Is your name Google? Because you have everything I've been searching for! 🔍",
                "Are you a camera? Because every time I look at you, I smile! 📸😊",
                "Do you believe in love at first sight, or should I walk by again? 👀💕",
                "Are you made of copper and tellurium? Because you're Cu-Te! ⚗️",
                "Are you a time traveler? Because I see you in my future! ⏰🔮",
                "Is your dad a boxer? Because you're a knockout! 🥊",
                "Are you a loan from a bank? Because you have my interest! 🏦💰",
                "Do you have a Band-Aid? Because I just scraped my knee falling for you! 🩹",
                "Are you lightning? Because you're striking! ⚡",
                "Are you a dictionary? Because you add meaning to my life! 📚",
                "Is your name Chapstick? Because you're da balm! 💋",
                "Are you a volcano? Because I lava you! 🌋❤️",
                "Do you like Star Wars? Because Yoda one for me! ⭐🛸",
                "Are you my appendix? Because I don't understand how you work, but this feeling in my stomach makes me want to take you out! 🏥",
                "Are you a beaver? Because daaaaam! 🦫",
                "Is your body from McDonald's? Because I'm lovin' it! 🍟",
                "Are you Netflix? Because I could watch you for hours! 📺",
                "Are you my phone charger? Because without you, I'd die! 🔌📱",
                "Are you a meme? Because I'd like to share you with all my friends! 😂",
                "Are you social media? Because I'm addicted to you! 📱💯",
                "Is your name Spotify? Because you're music to my ears! 🎵"
            ];

            const pickup = pickupLines[Math.floor(Math.random() * pickupLines.length)];
            const smoothness = Math.floor(Math.random() * 10) + 1; // 1-10 rating

            let responseText = `💕 *PICKUP LINE GENERATOR*\n\n`;
            
            if (targetUser) {
                responseText += `🎯 *For:* ${targetName}\n\n`;
            }
            
            responseText += `💬 *Line:* ${pickup}\n\n`;
            responseText += `😎 *Smoothness Level:* ${smoothness}/10\n`;
            
            if (smoothness >= 8) {
                responseText += `🔥 *Status:* LEGENDARY RIZZ! 🔥`;
            } else if (smoothness >= 6) {
                responseText += `😏 *Status:* Pretty smooth! 😏`;
            } else if (smoothness >= 4) {
                responseText += `😅 *Status:* Not bad, not bad! 😅`;
            } else {
                responseText += `🤦 *Status:* Oof, better luck next time! 🤦`;
            }

            responseText += `\n\n⚠️ *Disclaimer:*\n`;
            responseText += `• Use responsibly and respectfully\n`;
            responseText += `• These are just for fun and laughs\n`;
            responseText += `• Always respect boundaries\n`;
            responseText += `• Consent and kindness matter most\n\n`;
            responseText += `😄 *Remember:* The best pickup line is genuine conversation!`;

            await sock.sendMessage(from, {
                text: responseText,
                mentions: mentionedUsers
            });

        } catch (error) {
            console.error('Pickup command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Pickup Line Failed*\n\nEven my pickup line generator is speechless! 😅\n\nMaybe try: "Are you a WiFi signal? Because I\'m not getting a connection!" 📶'
            });
        }
    }
};