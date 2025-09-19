export default {
    name: 'roast',
    aliases: ['burn', 'savage', 'insult'],
    category: 'fun',
    description: 'Get a funny roast (all in good fun!)',
    usage: 'roast [@user]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const targetUser = mentionedUsers.length > 0 ? mentionedUsers[0] : message.key.participant || from;
            const targetName = mentionedUsers.length > 0 ? `@${targetUser.split('@')[0]}` : 'You';

            const roasts = [
                "have the perfect face for radio! 📻",
                "are like a software update - whenever someone sees you, they immediately think 'not now'! 💻",
                "are proof that God has a sense of humor! 😇",
                "have a face only a mother could love... and she probably needs glasses! 👓",
                "are like a participation trophy - everyone gets one, but nobody really wants it! 🏆",
                "have the kind of face that would make an onion cry! 🧅",
                "are like Monday morning - nobody's excited to see you! 📅",
                "have reached the perfect balance between stupid and annoying! ⚖️",
                "are like a broken clock - even you're right twice a day! ⏰",
                "have the personality of a wet cardboard box! 📦",
                "are like a math problem - confusing, frustrating, and everyone tries to avoid you! 🧮",
                "have WiFi connection issues - even when people try to connect with you, it fails! 📶",
                "are like a dictionary - you're full of words but nobody wants to read you! 📚",
                "have the energy of a Windows 95 computer trying to run modern software! 💾",
                "are like a selfie stick - useful sometimes, but mostly just annoying! 🤳",
                "have the social skills of a pop-up ad! 🚫",
                "are like expired milk - nobody wants you and you leave a bad taste! 🥛",
                "have the fashion sense of a colorblind penguin! 🐧",
                "are like a loading screen that never finishes! ⏳",
                "have the charm of a telemarketer calling during dinner! ☎️",
                "are like autocorrect - you try to help but just make everything worse! 📱",
                "have the personality of airplane food! ✈️🍽️",
                "are like a YouTube ad - everyone just wants to skip you! ⏭️",
                "have the appeal of a dentist appointment! 🦷",
                "are like a weather forecast - unreliable and nobody trusts you! 🌤️"
            ];

            const roast = roasts[Math.floor(Math.random() * roasts.length)];
            const spiceLevel = Math.floor(Math.random() * 5) + 1; // 1-5 peppers
            const peppers = '🌶️'.repeat(spiceLevel);

            const responseText = `🔥 *ROAST SESSION* 🔥\n\n🎯 *Target:* ${targetName}\n🌶️ *Spice Level:* ${peppers} (${spiceLevel}/5)\n\n💀 *Roast:* ${targetName} ${roast}\n\n😂 *Status:* ROASTED TO PERFECTION!\n\n⚠️ **IMPORTANT REMINDER:**\n• This is all in good fun! 😄\n• No real offense intended\n• Spread love, not hate ❤️\n• Everyone is awesome in their own way ✨\n• Roasts are just playful banter\n\n🤗 *Real talk:* ${targetName.replace('@', '')} is actually pretty cool! 😊`;

            await sock.sendMessage(from, {
                text: responseText,
                mentions: mentionedUsers
            });

        } catch (error) {
            console.error('Roast command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Roast Failed*\n\nEven the roast generator is speechless! 🔥😅\n\nMaybe this error is the real roast... 🤔'
            });
        }
    }
};