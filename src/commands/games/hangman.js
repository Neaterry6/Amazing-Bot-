const hangmanCache = new Map();

export default {
    name: 'hangman',
    aliases: ['hang'],
    category: 'games',
    description: 'Play hangman word guessing game',
    usage: 'hangman start or hangman <letter>',
    cooldown: 2,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const input = args[0].toLowerCase();
        const gameKey = `${sender}_${from}`;
        
        if (input === 'start' || input === 'new') {
            const words = [
                'javascript', 'python', 'computer', 'internet', 'keyboard', 'monitor',
                'software', 'hardware', 'programming', 'algorithm', 'database', 'network',
                'android', 'whatsapp', 'message', 'technology', 'artificial', 'intelligence',
                'machine', 'learning', 'development', 'application', 'framework', 'library'
            ];
            
            const word = words[Math.floor(Math.random() * words.length)].toUpperCase();
            const guessed = [];
            const wrongGuesses = [];
            
            hangmanCache.set(gameKey, {
                word: word,
                guessed: guessed,
                wrongGuesses: wrongGuesses,
                maxWrong: 6,
                startTime: Date.now()
            });
            
            return sock.sendMessage(from, {
                text: `🎮 *Hangman Game Started!*

${this.drawHangman(0)}

🔤 **Word:** ${this.displayWord(word, guessed)}
📝 **Guessed:** None yet
❌ **Wrong:** 0/6

🎯 Guess letters one at a time!
💡 Type \`hangman <letter>\`

*Example:* hangman a`
            });
        }
        
        const game = hangmanCache.get(gameKey);
        if (!game) {
            return sock.sendMessage(from, {
                text: `❌ *No active hangman game*\n\nStart one with \`hangman start\``
            });
        }
        
        const letter = input.toUpperCase();
        
        if (!/^[A-Z]$/.test(letter)) {
            return sock.sendMessage(from, {
                text: `❌ *Invalid input*\n\nPlease guess a single letter (A-Z)`
            });
        }
        
        if (game.guessed.includes(letter)) {
            return sock.sendMessage(from, {
                text: `❌ *Already guessed*\n\nYou already tried "${letter}". Try a different letter!`
            });
        }
        
        game.guessed.push(letter);
        
        if (game.word.includes(letter)) {
            const wordDisplay = this.displayWord(game.word, game.guessed);
            
            if (!wordDisplay.includes('_')) {
                // Word completed!
                const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(1);
                hangmanCache.delete(gameKey);
                
                return sock.sendMessage(from, {
                    text: `🎉 *YOU WON!* 🏆

${this.drawHangman(game.wrongGuesses.length)}

✅ **Word:** ${game.word}
⏱️ **Time:** ${timeTaken}s
❌ **Wrong guesses:** ${game.wrongGuesses.length}/${game.maxWrong}
📝 **All guesses:** ${game.guessed.join(', ')}

🌟 Excellent word guessing!
🆕 Play again: \`hangman start\``
                });
            }
            
            return sock.sendMessage(from, {
                text: `✅ *Good guess!*

${this.drawHangman(game.wrongGuesses.length)}

🔤 **Word:** ${wordDisplay}
📝 **Guessed:** ${game.guessed.join(', ')}
❌ **Wrong:** ${game.wrongGuesses.length}/${game.maxWrong}

🎯 Keep guessing!`
            });
        } else {
            game.wrongGuesses.push(letter);
            
            if (game.wrongGuesses.length >= game.maxWrong) {
                hangmanCache.delete(gameKey);
                
                return sock.sendMessage(from, {
                    text: `💀 *GAME OVER!*

${this.drawHangman(game.wrongGuesses.length)}

❌ **You lost!**
✅ **The word was:** ${game.word}
📝 **Your guesses:** ${game.guessed.join(', ')}
❌ **Wrong letters:** ${game.wrongGuesses.join(', ')}

🆕 Try again: \`hangman start\``
                });
            }
            
            return sock.sendMessage(from, {
                text: `❌ *Wrong letter!*

${this.drawHangman(game.wrongGuesses.length)}

🔤 **Word:** ${this.displayWord(game.word, game.guessed)}
📝 **Guessed:** ${game.guessed.join(', ')}
❌ **Wrong:** ${game.wrongGuesses.length}/${game.maxWrong}

⚠️ Be careful! ${game.maxWrong - game.wrongGuesses.length} wrong guesses left!`
            });
        }
    },
    
    displayWord(word, guessed) {
        return word
            .split('')
            .map(letter => guessed.includes(letter) ? letter : '_')
            .join(' ');
    },
    
    drawHangman(wrongCount) {
        const stages = [
            // 0 wrong
            `  +---+
  |   |
      |
      |
      |
      |
=========`,
            // 1 wrong
            `  +---+
  |   |
  O   |
      |
      |
      |
=========`,
            // 2 wrong
            `  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
            // 3 wrong
            `  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
            // 4 wrong
            `  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
            // 5 wrong
            `  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
            // 6 wrong (game over)
            `  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`
        ];
        
        return '```\n' + stages[Math.min(wrongCount, 6)] + '\n```';
    }
};