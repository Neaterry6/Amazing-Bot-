module.exports = {
    name: 'ship',
    aliases: ['love', 'match', 'compatibility'],
    category: 'fun',
    description: 'Calculate love compatibility between two people',
    usage: 'ship [@user1] [@user2] or ship [@user]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const sender = message.key.participant || from;
            
            let user1, user2, name1, name2;
            
            if (mentionedUsers.length >= 2) {
                // Ship two mentioned users
                user1 = mentionedUsers[0];
                user2 = mentionedUsers[1];
                name1 = `@${user1.split('@')[0]}`;
                name2 = `@${user2.split('@')[0]}`;
            } else if (mentionedUsers.length === 1) {
                // Ship sender with mentioned user
                user1 = sender;
                user2 = mentionedUsers[0];
                name1 = `@${user1.split('@')[0]}`;
                name2 = `@${user2.split('@')[0]}`;
            } else {
                return await sock.sendMessage(from, {
                    text: `💕 *Love Calculator*\n\n*Usage:*\n• ${prefix}ship @user1 @user2\n• ${prefix}ship @user (ships you with them)\n\n*Examples:*\n• ${prefix}ship @alice @bob\n• ${prefix}ship @someone\n\n💘 Let's see who's compatible! 💘`
                });
            }

            if (user1 === user2) {
                return await sock.sendMessage(from, {
                    text: `💕 *Self Love Alert!* 💕\n\n🤳 Someone's trying to ship themselves!\n\n💯 *Self-love compatibility:* 100%\n\n✨ *Remember:* You have to love yourself first! ✨\n\n😄 But seriously, mention someone else to ship with! 😄`
                });
            }

            await sock.sendMessage(from, {
                text: `💕 *Calculating Love Compatibility...*\n\n👥 *Couple:* ${name1} ❤️ ${name2}\n\n🔮 *Analyzing chemistry...*\n💫 *Computing cosmic alignment...*\n⏰ *Please wait...*`,
                mentions: [user1, user2]
            });

            setTimeout(async () => {
                try {
                    // Generate "random" but consistent compatibility based on user IDs
                    const combined = user1 + user2;
                    let hash = 0;
                    for (let i = 0; i < combined.length; i++) {
                        const char = combined.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash; // Convert to 32-bit integer
                    }
                    
                    const compatibility = Math.abs(hash % 101); // 0-100%
                    
                    // Generate ship name
                    const name1Clean = name1.replace('@', '');
                    const name2Clean = name2.replace('@', '');
                    const shipName = name1Clean.slice(0, Math.ceil(name1Clean.length / 2)) + 
                                   name2Clean.slice(Math.floor(name2Clean.length / 2));

                    let status, emoji, description;
                    
                    if (compatibility >= 90) {
                        status = 'SOULMATES';
                        emoji = '💖✨';
                        description = 'Perfect match! Written in the stars! 🌟';
                    } else if (compatibility >= 75) {
                        status = 'EXCELLENT MATCH';
                        emoji = '💕💫';
                        description = 'Amazing chemistry! Very compatible! 🔥';
                    } else if (compatibility >= 60) {
                        status = 'GOOD MATCH';
                        emoji = '💗💖';
                        description = 'Great potential! Good vibes! ✨';
                    } else if (compatibility >= 40) {
                        status = 'OKAY MATCH';
                        emoji = '💛💙';
                        description = 'Could work with effort! 💪';
                    } else if (compatibility >= 25) {
                        status = 'CHALLENGING';
                        emoji = '🧡💜';
                        description = 'Opposites attract? Maybe... 🤔';
                    } else {
                        status = 'INCOMPATIBLE';
                        emoji = '💔😅';
                        description = 'Better as friends! Friendship is magic! 🤝';
                    }

                    // Love meter visualization
                    const filled = Math.floor(compatibility / 10);
                    const empty = 10 - filled;
                    const meter = '❤️'.repeat(filled) + '🤍'.repeat(empty);

                    const responseText = `💕 *LOVE COMPATIBILITY RESULTS* 💕\n\n👥 *Couple:* ${name1} ❤️ ${name2}\n💝 *Ship Name:* ${shipName}\n\n💯 *Compatibility:* ${compatibility}%\n${meter}\n\n${emoji} *Status:* ${status}\n💬 *Analysis:* ${description}\n\n🔮 *Love Prediction:*\n${compatibility >= 75 ? '• Destined to be together! 💫' : 
                      compatibility >= 50 ? '• Great friendship potential! 🤝' : 
                      '• Adventure awaits in friendship! 🌈'}\n${compatibility >= 60 ? '• Perfect date night compatibility! 🌃' : 
                      '• Better as study buddies! 📚'}\n${compatibility >= 80 ? '• Made for each other! 💖' : 
                      '• Complementary differences! 🎭'}\n\n⚠️ *Disclaimer:* This is purely for entertainment! Real love is about understanding, respect, and communication! 💕\n\n😄 *Remember:* Every relationship is what you make of it! ✨`;

                    await sock.sendMessage(from, {
                        text: responseText,
                        mentions: [user1, user2]
                    });

                } catch (error) {
                    await sock.sendMessage(from, {
                        text: '❌ *Love Calculator Error*\n\nEven cupid\'s technology failed! 💘💥\n\nMaybe love is too complex for calculations! 💕'
                    });
                }
            }, 3000);

        } catch (error) {
            console.error('Ship command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Ship Error*\n\nThe love boat has crashed! ⛵💥\n\nTry again when cupid fixes the GPS! 💘🗺️'
            });
        }
    }
};