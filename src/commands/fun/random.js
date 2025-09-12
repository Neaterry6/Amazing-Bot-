module.exports = {
    name: 'random',
    aliases: ['rand', 'rng', 'choose'],
    category: 'fun',
    description: 'Generate random numbers, pick choices, or random facts',
    usage: 'random [type] [options]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const type = args[0]?.toLowerCase() || 'number';

            if (type === 'number' || type === 'num') {
                const min = parseInt(args[1]) || 1;
                const max = parseInt(args[2]) || 100;
                
                if (min >= max) {
                    return await sock.sendMessage(from, {
                        text: `❌ *Invalid Range*\n\nMinimum must be less than maximum.\n\n*Usage:* ${prefix}random number [min] [max]\n*Example:* ${prefix}random number 1 100`
                    });
                }

                const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
                
                await sock.sendMessage(from, {
                    text: `🎲 *Random Number*\n\n🔢 *Result:* ${randomNum}\n📊 *Range:* ${min} - ${max}\n🎯 *Precision:* Perfect randomness!`
                });

            } else if (type === 'choice' || type === 'pick' || type === 'choose') {
                const choices = args.slice(1);
                
                if (choices.length < 2) {
                    return await sock.sendMessage(from, {
                        text: `❌ *Need More Options*\n\nProvide at least 2 choices to pick from.\n\n*Usage:* ${prefix}random choice [option1] [option2] [option3]...\n*Example:* ${prefix}random choice pizza burger sushi`
                    });
                }

                const randomChoice = choices[Math.floor(Math.random() * choices.length)];
                
                await sock.sendMessage(from, {
                    text: `🎯 *Random Choice*\n\n✨ *Winner:* ${randomChoice}\n\n📝 *Options were:*\n${choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n')}\n\n🎪 *The fate has decided!*`
                });

            } else if (type === 'fact' || type === 'facts') {
                const facts = [
                    "Honey never spoils. Archaeologists have found 3000-year-old honey that's still edible! 🍯",
                    "A group of flamingos is called a 'flamboyance'! 🦩",
                    "Bananas are berries, but strawberries aren't! 🍌🍓",
                    "There are more possible games of chess than atoms in the observable universe! ♟️",
                    "Octopuses have three hearts and blue blood! 🐙💙",
                    "The shortest war in history lasted only 38-45 minutes! ⚔️",
                    "A shrimp's heart is in its head! 🦐💕",
                    "Polar bears have black skin under their white fur! 🐻‍❄️",
                    "Wombat poop is cube-shaped! 📦",
                    "There are more trees on Earth than stars in the Milky Way! 🌳⭐",
                    "Your nose can remember 50,000 different scents! 👃",
                    "A cloud can weigh over a million pounds! ☁️",
                    "Butterflies taste with their feet! 🦋👣",
                    "The human brain uses about 20% of your body's energy! 🧠⚡",
                    "A day on Venus is longer than its year! 🪐"
                ];

                const randomFact = facts[Math.floor(Math.random() * facts.length)];
                
                await sock.sendMessage(from, {
                    text: `🤯 *Random Fact*\n\n💡 ${randomFact}\n\n🎓 *Mind = Blown!*\n\n📚 Knowledge is power!`
                });

            } else if (type === 'color' || type === 'colour') {
                const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A'];
                const colorNames = ['Red', 'Green', 'Blue', 'Yellow', 'Magenta', 'Cyan', 'Orange', 'Purple', 'Pink', 'Brown'];
                
                const randomIndex = Math.floor(Math.random() * colors.length);
                const randomColor = colors[randomIndex];
                const colorName = colorNames[randomIndex];
                
                await sock.sendMessage(from, {
                    text: `🎨 *Random Color*\n\n🌈 *Color:* ${colorName}\n🎯 *Hex Code:* ${randomColor}\n✨ *Use this in your designs!*`
                });

            } else if (type === 'password' || type === 'pass') {
                const length = parseInt(args[1]) || 12;
                
                if (length < 4 || length > 50) {
                    return await sock.sendMessage(from, {
                        text: `❌ *Invalid Length*\n\nPassword length must be between 4 and 50 characters.\n\n*Usage:* ${prefix}random password [length]\n*Example:* ${prefix}random password 16`
                    });
                }

                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
                let password = '';
                
                for (let i = 0; i < length; i++) {
                    password += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                
                await sock.sendMessage(from, {
                    text: `🔐 *Random Password*\n\n🔑 *Generated:* \`${password}\`\n📏 *Length:* ${length} characters\n⚠️ *Security:* Strong encryption recommended!\n\n🛡️ *Remember to save it securely!*`
                });

            } else {
                await sock.sendMessage(from, {
                    text: `🎲 *Random Generator*\n\n*Available types:*\n• ${prefix}random number [min] [max]\n• ${prefix}random choice [opt1] [opt2] [opt3]...\n• ${prefix}random fact\n• ${prefix}random color\n• ${prefix}random password [length]\n\n*Examples:*\n• ${prefix}random number 1 100\n• ${prefix}random choice pizza burger sushi\n• ${prefix}random fact\n• ${prefix}random password 16`
                });
            }

        } catch (error) {
            console.error('Random command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Random Error*\n\nEven randomness can be predictably unpredictable! 🎭\n\nIronically, this error was... random! 🎲'
            });
        }
    }
};