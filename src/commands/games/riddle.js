const riddleCache = new Map();

module.exports = {
    name: 'riddle',
    aliases: ['puzzle', 'brain'],
    category: 'games',
    description: 'Brain teasing riddles to solve',
    usage: 'riddle start or riddle <answer>',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const input = args.join(' ').toLowerCase();
        const gameKey = `${sender}_${from}`;
        
        if (input === 'start' || input === 'new') {
            const riddle = this.getRandomRiddle();
            
            riddleCache.set(gameKey, {
                riddle: riddle.riddle,
                answer: riddle.answer.toLowerCase(),
                hints: riddle.hints,
                difficulty: riddle.difficulty,
                category: riddle.category,
                attempts: 0,
                startTime: Date.now()
            });
            
            return sock.sendMessage(from, {
                text: `🧩 *Brain Riddle Challenge*

🎯 **Difficulty:** ${riddle.difficulty}
📚 **Category:** ${riddle.category}

🤔 **Riddle:**
*${riddle.riddle}*

💡 Type \`riddle <your answer>\` to solve
🆘 Type \`riddle hint\` if you need help

🧠 Think carefully...

*Example:* riddle water`
            });
        }
        
        const game = riddleCache.get(gameKey);
        if (!game) {
            return sock.sendMessage(from, {
                text: `❌ *No active riddle*\n\nStart one with \`riddle start\``
            });
        }
        
        if (input === 'hint') {
            game.attempts++;
            
            if (game.attempts > game.hints.length) {
                return sock.sendMessage(from, {
                    text: `💡 *No more hints available!*\n\nYou've used all ${game.hints.length} hints. Keep thinking! 🧠`
                });
            }
            
            const hint = game.hints[game.attempts - 1];
            return sock.sendMessage(from, {
                text: `💡 *Hint ${game.attempts}/${game.hints.length}:*

${hint}

🤔 Does this help you figure it out?
🎯 Type \`riddle <answer>\` to solve`
            });
        }
        
        game.attempts++;
        const userAnswer = input.trim();
        
        // Check if answer is correct (allow for variations)
        if (this.checkAnswer(userAnswer, game.answer)) {
            const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(1);
            riddleCache.delete(gameKey);
            
            let score = 100;
            if (game.difficulty === 'Medium') score = 150;
            else if (game.difficulty === 'Hard') score = 200;
            
            // Penalty for hints and attempts
            score -= (game.attempts - 1) * 10;
            score = Math.max(score, 10); // Minimum score
            
            let performance;
            if (game.attempts === 1) performance = "🏆 Perfect! First try!";
            else if (game.attempts <= 2) performance = "🌟 Excellent!";
            else if (game.attempts <= 4) performance = "👍 Good job!";
            else performance = "👌 You got it!";
            
            return sock.sendMessage(from, {
                text: `🎉 *CORRECT!* ✅

✅ **Answer:** ${game.answer}
🎯 **Attempts:** ${game.attempts}
⏱️ **Time:** ${timeTaken}s
🏆 **Score:** ${score} points
📊 **Performance:** ${performance}

🧠 **Explanation:** ${this.getExplanation(game.answer)}

🆕 Next challenge: \`riddle start\``
            });
        } else {
            if (game.attempts >= 5) {
                riddleCache.delete(gameKey);
                
                return sock.sendMessage(from, {
                    text: `❌ *Game Over!*

🤔 **Your answer:** ${userAnswer}
✅ **Correct answer:** ${game.answer}
🎯 **Total attempts:** ${game.attempts}

🧠 **Explanation:** ${this.getExplanation(game.answer)}

💪 Don't give up! Try another riddle:
🆕 \`riddle start\``
                });
            }
            
            const encouragement = [
                "Not quite! Keep thinking! 🤔",
                "Close, but not the right answer! 🧩",
                "Good try! Think differently! 💭",
                "Almost there! Don't give up! 💪"
            ];
            
            const message = encouragement[Math.floor(Math.random() * encouragement.length)];
            
            return sock.sendMessage(from, {
                text: `❌ *${message}*

🤔 **Your answer:** ${userAnswer}
🎯 **Attempts:** ${game.attempts}/5
💡 **Hint available:** \`riddle hint\`

Keep trying! 🧠`
            });
        }
    },
    
    getRandomRiddle() {
        const riddles = [
            {
                riddle: "I'm tall when I'm young, and short when I'm old. What am I?",
                answer: "candle",
                hints: [
                    "I provide light in darkness",
                    "I get smaller as I'm used",
                    "I'm made of wax"
                ],
                difficulty: "Easy",
                category: "Objects"
            },
            {
                riddle: "What has keys but no locks, space but no room, you can enter but not go inside?",
                answer: "keyboard",
                hints: [
                    "You use me to type",
                    "I'm essential for computers",
                    "I have letters and numbers"
                ],
                difficulty: "Medium",
                category: "Technology"
            },
            {
                riddle: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
                answer: "map",
                hints: [
                    "I help you navigate",
                    "I show locations and places",
                    "You can fold me or view me digitally"
                ],
                difficulty: "Hard",
                category: "Objects"
            },
            {
                riddle: "The more you take, the more you leave behind. What am I?",
                answer: "footsteps",
                hints: [
                    "I'm related to walking",
                    "I'm left behind as evidence",
                    "You make me when you move"
                ],
                difficulty: "Medium",
                category: "Abstract"
            },
            {
                riddle: "What gets wet while drying?",
                answer: "towel",
                hints: [
                    "You use me in the bathroom",
                    "I help clean things",
                    "I absorb water"
                ],
                difficulty: "Easy",
                category: "Objects"
            },
            {
                riddle: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?",
                answer: "echo",
                hints: [
                    "I repeat what you say",
                    "You often hear me in mountains or empty rooms",
                    "I'm a sound phenomenon"
                ],
                difficulty: "Hard",
                category: "Nature"
            },
            {
                riddle: "What begins with T, ends with T, and has T in it?",
                answer: "teapot",
                hints: [
                    "I'm used for making hot beverages",
                    "I hold liquid",
                    "I have a spout and handle"
                ],
                difficulty: "Medium",
                category: "Wordplay"
            },
            {
                riddle: "I'm not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?",
                answer: "fire",
                hints: [
                    "I provide heat and light",
                    "I consume fuel to survive",
                    "I'm dangerous if not controlled"
                ],
                difficulty: "Hard",
                category: "Elements"
            }
        ];
        
        return riddles[Math.floor(Math.random() * riddles.length)];
    },
    
    checkAnswer(userAnswer, correctAnswer) {
        // Normalize answers and check for close matches
        const normalized = userAnswer.replace(/[^a-z0-9]/g, '');
        const correct = correctAnswer.replace(/[^a-z0-9]/g, '');
        
        return normalized === correct || 
               normalized.includes(correct) || 
               correct.includes(normalized);
    },
    
    getExplanation(answer) {
        const explanations = {
            "candle": "A candle starts tall but burns down and gets shorter as it's used, representing aging from young to old.",
            "keyboard": "A computer keyboard has keys (buttons) but no locks, spaces between keys but no room, and you can press Enter but not physically go inside.",
            "map": "A map shows cities, mountains, and bodies of water, but doesn't contain the actual physical features or living things.",
            "footsteps": "The more steps you take while walking, the more footprints you leave behind.",
            "towel": "A towel gets wet when you use it to dry yourself or other things.",
            "echo": "An echo is a sound that repeats your voice, seemingly 'speaking' and 'hearing' without physical form, and is carried by wind.",
            "teapot": "The word 'teapot' begins with 'T', ends with 'T', and contains tea (sounds like 'T') inside.",
            "fire": "Fire grows by consuming fuel, needs oxygen (air) to burn, but water extinguishes it."
        };
        
        return explanations[answer] || `The answer is ${answer}.`;
    }
};