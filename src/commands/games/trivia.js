const triviaCache = new Map();

module.exports = {
    name: 'trivia',
    aliases: ['quiz', 'question'],
    category: 'games',
    description: 'Trivia quiz game with multiple categories',
    usage: 'trivia start or trivia <answer>',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const input = args[0].toLowerCase();
        const gameKey = `${sender}_${from}`;
        
        if (input === 'start' || input === 'new') {
            const question = this.getRandomQuestion();
            
            triviaCache.set(gameKey, {
                question: question.question,
                correct: question.correct,
                options: question.options,
                category: question.category,
                difficulty: question.difficulty,
                startTime: Date.now(),
                score: 0,
                streak: 0
            });
            
            const optionsText = question.options
                .map((option, index) => `${String.fromCharCode(65 + index)}) ${option}`)
                .join('\n');
            
            return sock.sendMessage(from, {
                text: `🧠 *Trivia Quiz*

📚 **Category:** ${question.category}
⭐ **Difficulty:** ${question.difficulty}

❓ **Question:**
${question.question}

**Options:**
${optionsText}

🎮 Type \`trivia <A/B/C/D>\` to answer
⏰ You have 30 seconds!

*Example:* trivia A`
            });
        }
        
        const game = triviaCache.get(gameKey);
        if (!game) {
            return sock.sendMessage(from, {
                text: `❌ *No active trivia game*\n\nStart one with \`trivia start\``
            });
        }
        
        const answer = input.toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(answer)) {
            return sock.sendMessage(from, {
                text: `❌ *Invalid answer*\n\nPlease choose A, B, C, or D`
            });
        }
        
        const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(1);
        const selectedOption = game.options[answer.charCodeAt(0) - 65];
        const isCorrect = selectedOption === game.correct;
        
        if (isCorrect) {
            let points = 10;
            if (game.difficulty === 'Medium') points = 15;
            else if (game.difficulty === 'Hard') points = 25;
            
            // Time bonus
            if (timeTaken < 10) points += 5;
            
            game.score += points;
            game.streak++;
            
            // Streak bonus
            if (game.streak >= 3) points += game.streak * 2;
            
            triviaCache.delete(gameKey);
            
            return sock.sendMessage(from, {
                text: `🎉 *CORRECT!* ✅

📝 **Your answer:** ${answer}) ${selectedOption}
⏱️ **Time:** ${timeTaken}s
🏆 **Points:** +${points}
🔥 **Streak:** ${game.streak}

📊 **Total Score:** ${game.score}

🌟 **Fun Fact:** ${this.getFunFact(game.category)}

🆕 Next question: \`trivia start\``
            });
        } else {
            triviaCache.delete(gameKey);
            
            return sock.sendMessage(from, {
                text: `❌ *Wrong Answer*

📝 **Your answer:** ${answer}) ${selectedOption}
✅ **Correct answer:** ${game.correct}
⏱️ **Time:** ${timeTaken}s
🔥 **Streak broken:** ${game.streak}

📊 **Final Score:** ${game.score}

💡 **Explanation:** ${this.getExplanation(game.question, game.correct)}

🆕 Try again: \`trivia start\``
            });
        }
    },
    
    getRandomQuestion() {
        const questions = [
            {
                category: "Science",
                difficulty: "Easy",
                question: "What planet is closest to the Sun?",
                options: ["Venus", "Mercury", "Mars", "Earth"],
                correct: "Mercury"
            },
            {
                category: "Geography",
                difficulty: "Medium",
                question: "What is the capital of Australia?",
                options: ["Sydney", "Melbourne", "Canberra", "Perth"],
                correct: "Canberra"
            },
            {
                category: "History",
                difficulty: "Hard",
                question: "In which year did World War II end?",
                options: ["1944", "1945", "1946", "1943"],
                correct: "1945"
            },
            {
                category: "Technology",
                difficulty: "Medium",
                question: "What does 'HTTP' stand for?",
                options: ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "Home Tool Transfer Protocol", "Hyper Transfer Text Protocol"],
                correct: "HyperText Transfer Protocol"
            },
            {
                category: "Sports",
                difficulty: "Easy",
                question: "How many players are on a basketball team on court at once?",
                options: ["4", "5", "6", "7"],
                correct: "5"
            },
            {
                category: "Science",
                difficulty: "Hard",
                question: "What is the chemical symbol for gold?",
                options: ["Go", "Gd", "Au", "Ag"],
                correct: "Au"
            },
            {
                category: "Geography",
                difficulty: "Easy",
                question: "Which continent is the largest?",
                options: ["Africa", "Asia", "North America", "Europe"],
                correct: "Asia"
            },
            {
                category: "Technology",
                difficulty: "Easy",
                question: "What does 'AI' stand for?",
                options: ["Artificial Intelligence", "Automatic Intelligence", "Advanced Intelligence", "Assisted Intelligence"],
                correct: "Artificial Intelligence"
            },
            {
                category: "History",
                difficulty: "Medium",
                question: "Who painted the Mona Lisa?",
                options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"],
                correct: "Leonardo da Vinci"
            },
            {
                category: "Sports",
                difficulty: "Medium",
                question: "In which sport would you perform a slam dunk?",
                options: ["Football", "Tennis", "Basketball", "Volleyball"],
                correct: "Basketball"
            }
        ];
        
        return questions[Math.floor(Math.random() * questions.length)];
    },
    
    getFunFact(category) {
        const facts = {
            "Science": "Mercury has no atmosphere, so its temperatures range from 800°F (430°C) during the day to -300°F (-180°C) at night!",
            "Geography": "Australia is the only country that is also a continent!",
            "History": "World War II involved more than 30 countries and lasted 6 years.",
            "Technology": "HTTP was invented by Tim Berners-Lee in 1989.",
            "Sports": "Basketball was invented in 1891 by Dr. James Naismith."
        };
        
        return facts[category] || "Thanks for playing!";
    },
    
    getExplanation(question, correct) {
        // Simple explanation system - could be expanded
        if (question.includes("Mercury")) {
            return "Mercury is indeed the closest planet to our Sun, orbiting at about 36 million miles away.";
        } else if (question.includes("Australia")) {
            return "While Sydney and Melbourne are larger cities, Canberra was specifically built to be the capital.";
        } else if (question.includes("World War II")) {
            return "WWII ended in 1945 with Japan's surrender in September.";
        } else if (question.includes("HTTP")) {
            return "HTTP is the foundation of data communication on the World Wide Web.";
        } else {
            return `The correct answer is ${correct}.`;
        }
    }
};