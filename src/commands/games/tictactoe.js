const tictactoeCache = new Map();

module.exports = {
    name: 'tictactoe',
    aliases: ['ttt', 'tic'],
    category: 'games',
    description: 'Play Tic-Tac-Toe against the bot',
    usage: 'tictactoe start or tictactoe <position>',
    cooldown: 2,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const input = args[0].toLowerCase();
        const gameKey = `${sender}_${from}`;
        
        if (input === 'start' || input === 'new') {
            const board = [
                [' ', ' ', ' '],
                [' ', ' ', ' '],
                [' ', ' ', ' ']
            ];
            
            tictactoeCache.set(gameKey, {
                board: board,
                playerSymbol: 'X',
                botSymbol: 'O',
                currentTurn: 'player',
                gameOver: false,
                startTime: Date.now()
            });
            
            return sock.sendMessage(from, {
                text: `⭕ *Tic-Tac-Toe Started!*

${this.displayBoard(board)}

🎮 **How to play:**
• You are ❌ (X)
• Bot is ⭕ (O)  
• Use positions 1-9 to make your move

🎯 **Your turn!** Choose a position:
\`tictactoe <1-9>\`

*Example:* tictactoe 5`
            });
        }
        
        const game = tictactoeCache.get(gameKey);
        if (!game) {
            return sock.sendMessage(from, {
                text: `❌ *No active game*\n\nStart one with \`tictactoe start\``
            });
        }
        
        if (game.gameOver) {
            return sock.sendMessage(from, {
                text: `❌ *Game already finished*\n\nStart a new game with \`tictactoe start\``
            });
        }
        
        const position = parseInt(input);
        if (!position || position < 1 || position > 9) {
            return sock.sendMessage(from, {
                text: `❌ *Invalid position*\n\nUse positions 1-9:\n${this.showPositions()}`
            });
        }
        
        const row = Math.floor((position - 1) / 3);
        const col = (position - 1) % 3;
        
        if (game.board[row][col] !== ' ') {
            return sock.sendMessage(from, {
                text: `❌ *Position taken*\n\nThat spot is already occupied. Choose another!`
            });
        }
        
        // Player move
        game.board[row][col] = game.playerSymbol;
        
        const winner = this.checkWinner(game.board);
        if (winner === 'X') {
            game.gameOver = true;
            tictactoeCache.delete(gameKey);
            
            return sock.sendMessage(from, {
                text: `🎉 *YOU WIN!* 🏆

${this.displayBoard(game.board)}

✅ You got three in a row!
🎯 Well played!

🆕 Play again: \`tictactoe start\``
            });
        }
        
        if (this.isBoardFull(game.board)) {
            game.gameOver = true;
            tictactoeCache.delete(gameKey);
            
            return sock.sendMessage(from, {
                text: `🤝 *It's a TIE!*

${this.displayBoard(game.board)}

📊 Nobody wins this round!

🆕 Play again: \`tictactoe start\``
            });
        }
        
        // Bot move
        const botMove = this.getBotMove(game.board);
        game.board[botMove.row][botMove.col] = game.botSymbol;
        
        const botWinner = this.checkWinner(game.board);
        if (botWinner === 'O') {
            game.gameOver = true;
            tictactoeCache.delete(gameKey);
            
            return sock.sendMessage(from, {
                text: `🤖 *Bot Wins!*

${this.displayBoard(game.board)}

❌ Bot got three in a row!
🎯 Better luck next time!

🆕 Try again: \`tictactoe start\``
            });
        }
        
        if (this.isBoardFull(game.board)) {
            game.gameOver = true;
            tictactoeCache.delete(gameKey);
            
            return sock.sendMessage(from, {
                text: `🤝 *It's a TIE!*

${this.displayBoard(game.board)}

📊 Nobody wins this round!

🆕 Play again: \`tictactoe start\``
            });
        }
        
        return sock.sendMessage(from, {
            text: `⭕ *Bot played position ${(botMove.row * 3) + botMove.col + 1}*

${this.displayBoard(game.board)}

🎯 **Your turn!** Choose position 1-9:`
        });
    },
    
    displayBoard(board) {
        const symbols = {
            'X': '❌',
            'O': '⭕',
            ' ': '⬜'
        };
        
        let display = '```\n';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                display += symbols[board[i][j]] + ' ';
            }
            display += '\n';
        }
        display += '```';
        
        return display;
    },
    
    showPositions() {
        return `\`\`\`
1 | 2 | 3
---------
4 | 5 | 6  
---------
7 | 8 | 9
\`\`\``;
    },
    
    checkWinner(board) {
        // Check rows
        for (let i = 0; i < 3; i++) {
            if (board[i][0] === board[i][1] && board[i][1] === board[i][2] && board[i][0] !== ' ') {
                return board[i][0];
            }
        }
        
        // Check columns
        for (let j = 0; j < 3; j++) {
            if (board[0][j] === board[1][j] && board[1][j] === board[2][j] && board[0][j] !== ' ') {
                return board[0][j];
            }
        }
        
        // Check diagonals
        if (board[0][0] === board[1][1] && board[1][1] === board[2][2] && board[0][0] !== ' ') {
            return board[0][0];
        }
        
        if (board[0][2] === board[1][1] && board[1][1] === board[2][0] && board[0][2] !== ' ') {
            return board[0][2];
        }
        
        return null;
    },
    
    isBoardFull(board) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] === ' ') {
                    return false;
                }
            }
        }
        return true;
    },
    
    getBotMove(board) {
        // Simple AI: Try to win, then block, then take center/corners
        
        // Check if bot can win
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] === ' ') {
                    board[i][j] = 'O';
                    if (this.checkWinner(board) === 'O') {
                        board[i][j] = ' '; // Reset
                        return { row: i, col: j };
                    }
                    board[i][j] = ' '; // Reset
                }
            }
        }
        
        // Check if need to block player
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] === ' ') {
                    board[i][j] = 'X';
                    if (this.checkWinner(board) === 'X') {
                        board[i][j] = ' '; // Reset
                        return { row: i, col: j };
                    }
                    board[i][j] = ' '; // Reset
                }
            }
        }
        
        // Take center if available
        if (board[1][1] === ' ') {
            return { row: 1, col: 1 };
        }
        
        // Take corners
        const corners = [[0,0], [0,2], [2,0], [2,2]];
        for (const [row, col] of corners) {
            if (board[row][col] === ' ') {
                return { row, col };
            }
        }
        
        // Take any available spot
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] === ' ') {
                    return { row: i, col: j };
                }
            }
        }
    }
};