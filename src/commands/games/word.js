const wordCache = new Map();

module.exports = {
    name: 'word',
    aliases: ['wordgame', 'letters'],
    category: 'games',
    description: 'Word-based mini games: scramble, rhyme, and word chain',
    usage: 'word <scramble/rhyme/chain> or word <answer>',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const input = args[0].toLowerCase();
        const gameKey = `${sender}_${from}`;
        
        if (['scramble', 'rhyme', 'chain'].includes(input)) {
            if (input === 'scramble') {
                const word = this.getRandomWord('medium');
                const scrambled = this.scrambleWord(word);
                
                wordCache.set(gameKey, {
                    type: 'scramble',
                    word: word.toLowerCase(),
                    scrambled: scrambled,
                    startTime: Date.now(),
                    attempts: 0
                });
                
                return sock.sendMessage(from, {
                    text: `🔤 *Word Scramble Challenge*

🎯 **Unscramble this word:**
**${scrambled.toUpperCase()}**

💡 **Hint:** ${this.getWordHint(word)}

🎮 Type \`word <your answer>\` to solve
⏰ You have 60 seconds!

*Example:* word computer`
                });
                
            } else if (input === 'rhyme') {
                const targetWord = this.getRandomWord('easy');
                const rhymes = this.getRhymingWords(targetWord);
                
                wordCache.set(gameKey, {
                    type: 'rhyme',
                    targetWord: targetWord.toLowerCase(),
                    validRhymes: rhymes,
                    foundRhymes: [],
                    startTime: Date.now(),
                    timeLimit: 45000 // 45 seconds
                });
                
                return sock.sendMessage(from, {
                    text: `🎵 *Rhyming Challenge*

🎯 **Find words that rhyme with:**
**"${targetWord.toUpperCase()}"**

📝 Found: 0/${rhymes.length} rhymes
⏰ Time: 45 seconds

🎮 Type \`word <rhyming word>\` 
💡 Think of words that sound similar!

*Example:* word cat → bat, hat, mat`
                });
                
            } else if (input === 'chain') {
                const startWord = this.getRandomWord('easy');
                
                wordCache.set(gameKey, {
                    type: 'chain',
                    currentWord: startWord.toLowerCase(),
                    chain: [startWord.toLowerCase()],
                    score: 0,
                    startTime: Date.now()
                });
                
                return sock.sendMessage(from, {
                    text: `🔗 *Word Chain Challenge*

🎯 **Starting word:** ${startWord.toUpperCase()}
📝 **Chain:** [${startWord}]

🎮 **Rules:**
• Next word must start with last letter of previous word
• No repeating words
• Must be valid English words

🎯 Your turn! Next word must start with **"${startWord.slice(-1).toUpperCase()}"**

*Example:* If word is "cat", next could be "tree"`
                });
            }
            return;
        }
        
        const game = wordCache.get(gameKey);
        if (!game) {
            return sock.sendMessage(from, {
                text: `❌ *No active word game*\n\nStart one with:\n• \`word scramble\` - Unscramble letters\n• \`word rhyme\` - Find rhyming words\n• \`word chain\` - Word association chain`
            });
        }
        
        const userInput = args.join(' ').toLowerCase().trim();
        
        if (game.type === 'scramble') {
            game.attempts++;
            
            if (userInput === game.word) {
                const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(1);
                wordCache.delete(gameKey);
                
                let points = 100 - (game.attempts - 1) * 10;
                if (timeTaken < 15) points += 25; // Speed bonus
                points = Math.max(points, 10);
                
                return sock.sendMessage(from, {
                    text: `🎉 *CORRECT!* ✅

✅ **Answer:** ${game.word}
🔤 **Scrambled:** ${game.scrambled}
🎯 **Attempts:** ${game.attempts}
⏱️ **Time:** ${timeTaken}s
🏆 **Points:** ${points}

🆕 Try another: \`word scramble\``
                });
            } else {
                if (game.attempts >= 3) {
                    wordCache.delete(gameKey);
                    return sock.sendMessage(from, {
                        text: `❌ *Out of attempts!*\n\n✅ **Answer:** ${game.word}\n🔤 **Scrambled:** ${game.scrambled}\n\n🆕 Try again: \`word scramble\``
                    });
                }
                
                return sock.sendMessage(from, {
                    text: `❌ *Wrong!* Try again (${3 - game.attempts} attempts left)\n\n🔤 **Scrambled:** ${game.scrambled}\n💡 **Hint:** ${this.getWordHint(game.word)}`
                });
            }
            
        } else if (game.type === 'rhyme') {
            const timeLeft = game.timeLimit - (Date.now() - game.startTime);
            
            if (timeLeft <= 0) {
                wordCache.delete(gameKey);
                return sock.sendMessage(from, {
                    text: `⏰ *Time's up!*\n\n📝 **Found:** ${game.foundRhymes.length}/${game.validRhymes.length}\n✅ **Valid rhymes:** ${game.validRhymes.join(', ')}\n\n🆕 Try again: \`word rhyme\``
                });
            }
            
            if (game.validRhymes.includes(userInput) && !game.foundRhymes.includes(userInput)) {
                game.foundRhymes.push(userInput);
                
                if (game.foundRhymes.length >= game.validRhymes.length) {
                    const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(1);
                    wordCache.delete(gameKey);
                    
                    return sock.sendMessage(from, {
                        text: `🎉 *ALL RHYMES FOUND!* 🏆\n\n🎵 **Target:** ${game.targetWord}\n✅ **Found:** ${game.foundRhymes.join(', ')}\n⏱️ **Time:** ${timeTaken}s\n🏆 **Perfect Score!**\n\n🆕 Next challenge: \`word rhyme\``
                    });
                }
                
                return sock.sendMessage(from, {
                    text: `✅ *Good rhyme!*\n\n📝 **Found:** ${game.foundRhymes.length}/${game.validRhymes.length}\n🎵 **Your rhymes:** ${game.foundRhymes.join(', ')}\n⏰ **Time left:** ${Math.ceil(timeLeft / 1000)}s\n\n🎯 Keep finding rhymes!`
                });
            } else if (game.foundRhymes.includes(userInput)) {
                return sock.sendMessage(from, { text: `❌ *Already found!* Try a different rhyme.` });
            } else {
                return sock.sendMessage(from, { text: `❌ *Not a valid rhyme!* Think of words that sound like "${game.targetWord}"` });
            }
            
        } else if (game.type === 'chain') {
            const lastWord = game.currentWord;
            const expectedLetter = lastWord.slice(-1);
            
            if (!userInput.startsWith(expectedLetter)) {
                return sock.sendMessage(from, {
                    text: `❌ *Wrong start letter!*\n\nYour word must start with **"${expectedLetter.toUpperCase()}"**\nLast word: "${lastWord}"`
                });
            }
            
            if (game.chain.includes(userInput)) {
                return sock.sendMessage(from, {
                    text: `❌ *Already used!*\n\n"${userInput}" is already in the chain. Try a different word.`
                });
            }
            
            if (!this.isValidWord(userInput)) {
                return sock.sendMessage(from, {
                    text: `❌ *Invalid word!*\n\nPlease use valid English words.`
                });
            }
            
            // Valid word - add to chain
            game.chain.push(userInput);
            game.currentWord = userInput;
            game.score += userInput.length;
            
            const nextLetter = userInput.slice(-1).toUpperCase();
            
            return sock.sendMessage(from, {
                text: `✅ *Added to chain!*\n\n🔗 **Chain:** [${game.chain.slice(-5).join(' → ')}${game.chain.length > 5 ? '...' : ''}]\n📊 **Length:** ${game.chain.length} words\n🏆 **Score:** ${game.score} points\n\n🎯 **Next word must start with: "${nextLetter}"**\n\nKeep the chain going!`
            });
        }
    },
    
    getRandomWord(difficulty) {
        const words = {
            easy: ['cat', 'dog', 'sun', 'tree', 'book', 'car', 'house', 'love', 'time', 'work'],
            medium: ['computer', 'elephant', 'mountain', 'butterfly', 'adventure', 'fantastic', 'wonderful', 'telephone'],
            hard: ['extraordinary', 'sophisticated', 'revolutionary', 'consciousness', 'entrepreneur']
        };
        
        const wordList = words[difficulty] || words.medium;
        return wordList[Math.floor(Math.random() * wordList.length)];
    },
    
    scrambleWord(word) {
        const letters = word.split('');
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        return letters.join('');
    },
    
    getWordHint(word) {
        const hints = {
            'computer': 'Electronic device for processing data',
            'elephant': 'Large mammal with a trunk',
            'mountain': 'Very high natural elevation',
            'butterfly': 'Colorful flying insect',
            'adventure': 'Exciting journey or experience',
            'fantastic': 'Extremely good or impressive',
            'wonderful': 'Inspiring delight or admiration',
            'telephone': 'Device for voice communication'
        };
        
        return hints[word.toLowerCase()] || `${word.length} letters long`;
    },
    
    getRhymingWords(word) {
        const rhymes = {
            'cat': ['bat', 'hat', 'mat', 'rat', 'sat'],
            'dog': ['fog', 'log', 'jog', 'bog'],
            'sun': ['fun', 'run', 'gun', 'bun', 'won'],
            'tree': ['free', 'see', 'bee', 'tea', 'key'],
            'book': ['look', 'took', 'cook', 'hook'],
            'car': ['far', 'bar', 'star', 'jar'],
            'house': ['mouse', 'spouse'],
            'love': ['dove', 'above', 'glove'],
            'time': ['rhyme', 'climb', 'lime'],
            'work': ['fork', 'cork', 'pork']
        };
        
        return rhymes[word.toLowerCase()] || ['love', 'dove']; // fallback
    },
    
    isValidWord(word) {
        // Simple validation - in a real implementation, you'd check against a dictionary
        const commonWords = [
            'apple', 'elephant', 'tiger', 'rainbow', 'window', 'wonderful', 'listen', 'number',
            'orange', 'energy', 'yellow', 'water', 'rabbit', 'turkey', 'yellow', 'window',
            'table', 'earth', 'happy', 'young', 'green', 'north', 'house', 'every',
            'year', 'red', 'dream', 'music', 'car', 'run', 'new', 'white'
        ];
        
        return word.length >= 3 && word.length <= 15 && /^[a-z]+$/.test(word);
    }
};