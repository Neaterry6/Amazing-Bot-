const sessions = new Map();

const START_WORDS = ['apple', 'orange', 'banana', 'table', 'school', 'water', 'music', 'future', 'planet', 'family'];
const BOT_WORDS = [
    'apple', 'elephant', 'tiger', 'rabbit', 'tree', 'eagle', 'earth', 'hat',
    'table', 'engine', 'eraser', 'river', 'road', 'dream', 'moon', 'night',
    'teacher', 'rain', 'nose', 'egg', 'grape', 'energy', 'yellow', 'window'
];

function normalizeWord(word) {
    return String(word || '').toLowerCase().replace(/[^a-z]/g, '');
}

function pickBotWord(lastChar, used) {
    const choices = BOT_WORDS.filter(w => w.startsWith(lastChar) && !used.has(w));
    if (!choices.length) return null;
    return choices[Math.floor(Math.random() * choices.length)];
}

export default {
    name: 'wcg',
    aliases: ['wordchain', 'chain'],
    category: 'games',
    description: 'Play Word Chain Game against the bot',
    usage: 'wcg <start|word|status|stop>',
    example: 'wcg start\nwcg tiger\nwcg status\nwcg stop',
    cooldown: 2,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const action = args[0]?.toLowerCase();

        if (action === 'start') {
            const startWord = START_WORDS[Math.floor(Math.random() * START_WORDS.length)];
            sessions.set(from, {
                player: sender,
                currentWord: startWord,
                expectedChar: startWord.slice(-1),
                usedWords: new Set([startWord]),
                score: 0
            });

            return await sock.sendMessage(from, {
                text: `🎮 *Word Chain Game Started!*\n\nBot word: *${startWord}*\nYour next word must start with: *${startWord.slice(-1).toUpperCase()}*\n\nUse: *.wcg <word>*`
            }, { quoted: message });
        }

        if (action === 'stop') {
            if (!sessions.has(from)) {
                return await sock.sendMessage(from, { text: '❌ No active WCG session in this chat.' }, { quoted: message });
            }
            sessions.delete(from);
            return await sock.sendMessage(from, { text: '🛑 Word Chain Game stopped.' }, { quoted: message });
        }

        if (action === 'status') {
            const s = sessions.get(from);
            if (!s) return await sock.sendMessage(from, { text: '❌ No active WCG session. Start with *.wcg start*' }, { quoted: message });
            return await sock.sendMessage(from, {
                text: `🎮 *WCG Status*\n\nCurrent word: *${s.currentWord}*\nExpected start: *${s.expectedChar.toUpperCase()}*\nScore: *${s.score}*\nUsed words: *${s.usedWords.size}*`
            }, { quoted: message });
        }

        const session = sessions.get(from);
        if (!session) {
            return await sock.sendMessage(from, { text: '❌ Start game first with *.wcg start*' }, { quoted: message });
        }

        if (sender !== session.player) {
            return await sock.sendMessage(from, { text: '⏳ Another player is currently in this WCG session.' }, { quoted: message });
        }

        const playerWord = normalizeWord(args.join(' '));
        if (playerWord.length < 3) {
            return await sock.sendMessage(from, { text: '❌ Word must be at least 3 letters.' }, { quoted: message });
        }

        if (!playerWord.startsWith(session.expectedChar)) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid chain. Your word must start with *${session.expectedChar.toUpperCase()}*`
            }, { quoted: message });
        }

        if (session.usedWords.has(playerWord)) {
            return await sock.sendMessage(from, { text: '❌ Word already used in this game.' }, { quoted: message });
        }

        session.usedWords.add(playerWord);
        session.score += 1;

        const botExpected = playerWord.slice(-1);
        const botWord = pickBotWord(botExpected, session.usedWords);

        if (!botWord) {
            sessions.delete(from);
            return await sock.sendMessage(from, {
                text: `🏆 *You win!*\n\nI couldn't find a word starting with *${botExpected.toUpperCase()}*.\nFinal score: *${session.score}*`
            }, { quoted: message });
        }

        session.usedWords.add(botWord);
        session.currentWord = botWord;
        session.expectedChar = botWord.slice(-1);
        sessions.set(from, session);

        return await sock.sendMessage(from, {
            text: `✅ You: *${playerWord}*\n🤖 Bot: *${botWord}*\n\nYour next word must start with: *${session.expectedChar.toUpperCase()}*\nScore: *${session.score}*`
        }, { quoted: message });
    }
};
