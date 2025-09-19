const blackjackCache = new Map();

export default {
    name: 'blackjack',
    aliases: ['bj', '21'],
    category: 'games',
    description: 'Play Blackjack against the dealer',
    usage: 'blackjack start/hit/stand',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const action = args[0].toLowerCase();
        const gameKey = `${sender}_${from}`;
        
        if (action === 'start' || action === 'new') {
            const deck = this.createDeck();
            const playerHand = [this.drawCard(deck), this.drawCard(deck)];
            const dealerHand = [this.drawCard(deck), this.drawCard(deck)];
            
            blackjackCache.set(gameKey, {
                deck: deck,
                playerHand: playerHand,
                dealerHand: dealerHand,
                gameOver: false,
                startTime: Date.now()
            });
            
            const playerValue = this.calculateHandValue(playerHand);
            const dealerShownCard = dealerHand[0];
            
            if (playerValue === 21) {
                blackjackCache.delete(gameKey);
                return sock.sendMessage(from, {
                    text: `🃏 *BLACKJACK!* 🎉

👤 **Your cards:** ${this.displayCards(playerHand)} = 21
🎰 **Dealer shows:** ${dealerShownCard}

🏆 **BLACKJACK! You win!**
💰 **Payout:** 1.5x bet

🆕 Play again: \`blackjack start\``
                });
            }
            
            return sock.sendMessage(from, {
                text: `🃏 *Blackjack Game Started*

👤 **Your cards:** ${this.displayCards(playerHand)} = ${playerValue}
🎰 **Dealer shows:** ${dealerShownCard} + [Hidden]

🎮 **Actions:**
• \`blackjack hit\` - Take another card
• \`blackjack stand\` - Keep current hand

🎯 **Goal:** Get as close to 21 as possible without going over!`
            });
        }
        
        const game = blackjackCache.get(gameKey);
        if (!game) {
            return sock.sendMessage(from, {
                text: `❌ *No active blackjack game*\n\nStart one with \`blackjack start\``
            });
        }
        
        if (game.gameOver) {
            return sock.sendMessage(from, {
                text: `❌ *Game already finished*\n\nStart a new game with \`blackjack start\``
            });
        }
        
        if (action === 'hit') {
            const newCard = this.drawCard(game.deck);
            game.playerHand.push(newCard);
            const playerValue = this.calculateHandValue(game.playerHand);
            
            if (playerValue > 21) {
                game.gameOver = true;
                blackjackCache.delete(gameKey);
                
                return sock.sendMessage(from, {
                    text: `🃏 *BUST!* 💥

👤 **Your cards:** ${this.displayCards(game.playerHand)} = ${playerValue}
🎰 **Dealer had:** ${this.displayCards(game.dealerHand)} = ${this.calculateHandValue(game.dealerHand)}

❌ **You busted! Dealer wins.**
💸 **You lose your bet**

🆕 Try again: \`blackjack start\``
                });
            }
            
            return sock.sendMessage(from, {
                text: `🃏 *Card drawn: ${newCard}*

👤 **Your cards:** ${this.displayCards(game.playerHand)} = ${playerValue}
🎰 **Dealer shows:** ${game.dealerHand[0]} + [Hidden]

🎮 **Next action:**
• \`blackjack hit\` - Take another card  
• \`blackjack stand\` - Keep current hand`
            });
        }
        
        if (action === 'stand') {
            game.gameOver = true;
            
            // Dealer plays
            while (this.calculateHandValue(game.dealerHand) < 17) {
                game.dealerHand.push(this.drawCard(game.deck));
            }
            
            const playerValue = this.calculateHandValue(game.playerHand);
            const dealerValue = this.calculateHandValue(game.dealerHand);
            
            let result, payout;
            if (dealerValue > 21) {
                result = "🎉 **Dealer busted! You win!**";
                payout = "💰 **Payout:** 1x bet";
            } else if (playerValue > dealerValue) {
                result = "🎉 **You win!**";
                payout = "💰 **Payout:** 1x bet";
            } else if (dealerValue > playerValue) {
                result = "❌ **Dealer wins!**";
                payout = "💸 **You lose your bet**";
            } else {
                result = "🤝 **Push (Tie)!**";
                payout = "🔄 **Bet returned**";
            }
            
            blackjackCache.delete(gameKey);
            
            return sock.sendMessage(from, {
                text: `🃏 *Final Results*

👤 **Your cards:** ${this.displayCards(game.playerHand)} = ${playerValue}
🎰 **Dealer cards:** ${this.displayCards(game.dealerHand)} = ${dealerValue}

${result}
${payout}

🆕 Play again: \`blackjack start\``
            });
        }
        
        return sock.sendMessage(from, {
            text: `❌ *Invalid action*\n\nUse: \`blackjack hit\` or \`blackjack stand\``
        });
    },
    
    createDeck() {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];
        
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push(`${rank}${suit}`);
            }
        }
        
        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        return deck;
    },
    
    drawCard(deck) {
        return deck.pop();
    },
    
    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;
        
        for (const card of hand) {
            const rank = card.slice(0, -2); // Remove suit
            if (rank === 'A') {
                aces++;
                value += 11;
            } else if (['J', 'Q', 'K'].includes(rank)) {
                value += 10;
            } else {
                value += parseInt(rank);
            }
        }
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    },
    
    displayCards(hand) {
        return hand.join(' ');
    }
};