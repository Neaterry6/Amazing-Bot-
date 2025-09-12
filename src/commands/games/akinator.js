const akinatorCache = new Map();

module.exports = {
    name: 'akinator',
    aliases: ['aki', 'genie'],
    category: 'games',
    description: 'Akinator-style guessing game - I try to guess what you\'re thinking!',
    usage: 'akinator start or akinator <yes/no/maybe/probably/probably_not>',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const input = args[0].toLowerCase();
        const gameKey = `${sender}_${from}`;
        
        if (input === 'start' || input === 'new') {
            const firstQuestion = this.getRandomQuestion();
            
            akinatorCache.set(gameKey, {
                questions: [],
                answers: [],
                possibleAnswers: this.getAllPossibleAnswers(),
                currentQuestion: firstQuestion,
                questionCount: 0,
                startTime: Date.now()
            });
            
            return sock.sendMessage(from, {
                text: `🧞‍♂️ *Akinator - The Mind Reader*

🔮 Think of any **famous person, character, or celebrity** and I'll try to guess who it is!

❓ **Question 1:**
${firstQuestion}

🎮 **Answer with:**
• \`akinator yes\` - Definitely yes
• \`akinator no\` - Definitely no  
• \`akinator maybe\` - Maybe/sometimes
• \`akinator probably\` - Probably yes
• \`akinator probably_not\` - Probably no

🧠 I'm reading your mind... 👁️‍🗨️`
            });
        }
        
        const game = akinatorCache.get(gameKey);
        if (!game) {
            return sock.sendMessage(from, {
                text: `❌ *No active Akinator game*\n\nStart one with \`akinator start\``
            });
        }
        
        const validAnswers = ['yes', 'no', 'maybe', 'probably', 'probably_not'];
        if (!validAnswers.includes(input)) {
            return sock.sendMessage(from, {
                text: `❌ *Invalid answer*\n\nPlease answer with: yes, no, maybe, probably, or probably_not`
            });
        }
        
        // Record the answer
        game.answers.push({
            question: game.currentQuestion,
            answer: input
        });
        game.questionCount++;
        
        // Filter possible answers based on response
        game.possibleAnswers = this.filterAnswers(game.possibleAnswers, game.currentQuestion, input);
        
        // Check if we can make a guess
        if (game.possibleAnswers.length <= 3 || game.questionCount >= 20) {
            const guess = game.possibleAnswers[0] || { name: "someone very unique", description: "a mysterious person" };
            akinatorCache.delete(gameKey);
            
            return sock.sendMessage(from, {
                text: `🔮 *Akinator's Guess!*

🎯 **I think you're thinking of:**
**${guess.name}**

📝 **Description:** ${guess.description}

🤔 **Am I right?**
• If YES: 🎉 Akinator wins again!
• If NO: 😅 You got me this time!

📊 **Game Stats:**
• Questions asked: ${game.questionCount}
• Time taken: ${((Date.now() - game.startTime) / 1000).toFixed(1)}s
• Remaining possibilities: ${game.possibleAnswers.length}

🆕 Play again: \`akinator start\``
            });
        }
        
        // Ask next question
        const nextQuestion = this.getNextQuestion(game.answers, game.possibleAnswers);
        game.currentQuestion = nextQuestion;
        
        const progressBar = '█'.repeat(Math.floor(game.questionCount / 4)) + '░'.repeat(5 - Math.floor(game.questionCount / 4));
        
        return sock.sendMessage(from, {
            text: `🧞‍♂️ *Akinator continues...*

📊 **Progress:** [${progressBar}] ${game.questionCount}/20
🔍 **Possibilities:** ${game.possibleAnswers.length}

❓ **Question ${game.questionCount + 1}:**
${nextQuestion}

🎮 Answer: yes/no/maybe/probably/probably_not`
        });
    },
    
    getAllPossibleAnswers() {
        return [
            { name: "Albert Einstein", description: "Famous physicist known for theory of relativity", categories: ["scientist", "historical", "smart", "male"] },
            { name: "Leonardo da Vinci", description: "Renaissance artist and inventor", categories: ["artist", "historical", "smart", "male"] },
            { name: "Marilyn Monroe", description: "Famous actress and model", categories: ["actress", "historical", "beautiful", "female"] },
            { name: "Shakespeare", description: "Famous playwright and poet", categories: ["writer", "historical", "smart", "male"] },
            { name: "Mickey Mouse", description: "Disney's famous cartoon character", categories: ["character", "cartoon", "disney", "mouse"] },
            { name: "Harry Potter", description: "Fictional wizard character", categories: ["character", "fictional", "wizard", "young"] },
            { name: "Superman", description: "Superhero with incredible strength", categories: ["superhero", "strong", "fictional", "male"] },
            { name: "Wonder Woman", description: "Female superhero with superpowers", categories: ["superhero", "strong", "fictional", "female"] },
            { name: "Pikachu", description: "Famous Pokemon character", categories: ["character", "pokemon", "yellow", "cute"] },
            { name: "Spider-Man", description: "Superhero with spider powers", categories: ["superhero", "young", "fictional", "male"] },
            { name: "Elsa", description: "Ice queen from Frozen", categories: ["character", "disney", "princess", "female"] },
            { name: "Batman", description: "Dark knight superhero", categories: ["superhero", "dark", "rich", "male"] },
            { name: "Darth Vader", description: "Dark side character from Star Wars", categories: ["villain", "dark", "fictional", "male"] },
            { name: "Mario", description: "Famous video game plumber", categories: ["character", "videogame", "italian", "male"] },
            { name: "Sherlock Holmes", description: "Famous fictional detective", categories: ["detective", "smart", "fictional", "male"] }
        ];
    },
    
    getRandomQuestion() {
        const questions = [
            "Is your character real (not fictional)?",
            "Is your character male?",
            "Is your character still alive?",
            "Is your character from a movie or TV show?",
            "Does your character have superpowers?",
            "Is your character famous for being smart?",
            "Is your character a cartoon/animated?",
            "Is your character from the 20th century or later?"
        ];
        
        return questions[Math.floor(Math.random() * questions.length)];
    },
    
    getNextQuestion(previousAnswers, possibleAnswers) {
        // Simple question selection based on remaining possibilities
        const askedQuestions = previousAnswers.map(a => a.question);
        
        const allQuestions = [
            "Is your character real (not fictional)?",
            "Is your character male?", 
            "Is your character still alive?",
            "Is your character from a movie or TV show?",
            "Does your character have superpowers?",
            "Is your character famous for being smart?",
            "Is your character a cartoon/animated?",
            "Is your character from the 20th century or later?",
            "Is your character a superhero?",
            "Is your character from Disney?",
            "Is your character a villain?",
            "Is your character young (under 30)?",
            "Is your character known for their beauty?",
            "Is your character from a video game?",
            "Is your character a scientist?",
            "Is your character royal (king/queen/princess)?",
            "Does your character wear a costume?",
            "Is your character from America?",
            "Is your character known worldwide?",
            "Does your character have magical powers?"
        ];
        
        // Find unasked questions
        const unaskedQuestions = allQuestions.filter(q => !askedQuestions.includes(q));
        
        if (unaskedQuestions.length > 0) {
            return unaskedQuestions[Math.floor(Math.random() * unaskedQuestions.length)];
        }
        
        return "Does your character fit what I'm thinking of?";
    },
    
    filterAnswers(answers, question, response) {
        // Simple filtering logic based on question and response
        return answers.filter(answer => {
            if (question.includes("real") && question.includes("fictional")) {
                if (response === "yes") return !answer.categories.includes("fictional");
                if (response === "no") return answer.categories.includes("fictional");
            }
            
            if (question.includes("male")) {
                if (response === "yes") return answer.categories.includes("male");
                if (response === "no") return answer.categories.includes("female");
            }
            
            if (question.includes("superpowers")) {
                if (response === "yes") return answer.categories.includes("superhero");
                if (response === "no") return !answer.categories.includes("superhero");
            }
            
            if (question.includes("smart")) {
                if (response === "yes") return answer.categories.includes("smart") || answer.categories.includes("scientist");
                if (response === "no") return !answer.categories.includes("smart");
            }
            
            if (question.includes("cartoon") || question.includes("animated")) {
                if (response === "yes") return answer.categories.includes("cartoon") || answer.categories.includes("character");
                if (response === "no") return !answer.categories.includes("cartoon");
            }
            
            // For maybe/probably answers, keep most characters
            if (response === "maybe" || response === "probably" || response === "probably_not") {
                return Math.random() > 0.3; // Keep 70% randomly
            }
            
            return true;
        });
    }
};