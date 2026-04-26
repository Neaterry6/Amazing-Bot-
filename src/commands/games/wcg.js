import axios from 'axios';

const JOIN_WINDOW_MS = 40_000;
const TURN_TIMEOUT_MS = 30 * 60 * 1000;
const games = new Map();

const LOCAL_WORDS = new Set([
    'apple', 'ant', 'alpha', 'arrow', 'angle', 'banana', 'band', 'beach', 'breeze', 'cat', 'camel',
    'circle', 'delta', 'dream', 'dusk', 'echo', 'eagle', 'flame', 'forest', 'glory', 'grace', 'happy',
    'honey', 'island', 'jungle', 'king', 'lemon', 'magic', 'night', 'ocean', 'power', 'queen', 'river',
    'stone', 'tiger', 'unity', 'valor', 'water', 'world', 'xenon', 'youth', 'zebra'
]);

function normalizeWord(input = '') {
    return String(input || '').trim().toLowerCase().replace(/[^a-z]/g, '');
}

function senderJid(message) {
    return message?.key?.participant || message?.key?.remoteJid || '';
}

function mention(jid) {
    return `@${String(jid || '').split('@')[0]}`;
}

function clearChatHandler(chatId) {
    if (global.chatHandlers?.[chatId]) delete global.chatHandlers[chatId];
}

function setChatHandler(chatId, handler) {
    if (!global.chatHandlers) global.chatHandlers = {};
    global.chatHandlers[chatId] = { command: 'wcg', handler };
}

async function isValidEnglishWord(word) {
    if (!word || word.length < 2) return false;
    if (LOCAL_WORDS.has(word)) return true;
    try {
        const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 12000 });
        return Array.isArray(data) && data.length > 0;
    } catch {
        return false;
    }
}

function pickLetter(lastWord, type = 'chain') {
    if (type === 'chain' && lastWord) return lastWord.at(-1);
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    return letters[Math.floor(Math.random() * letters.length)];
}

function nextAliveIndex(players, startIndex) {
    if (!players.length) return -1;
    for (let i = 0; i < players.length; i += 1) {
        const idx = (startIndex + i) % players.length;
        if (!players[idx].out) return idx;
    }
    return -1;
}

function stopGame(chatId) {
    const game = games.get(chatId);
    if (!game) return;
    if (game.joinTimer) clearTimeout(game.joinTimer);
    if (game.turnTimer) clearTimeout(game.turnTimer);
    clearChatHandler(chatId);
    games.delete(chatId);
}

async function promptTurn(sock, game, quoted = null) {
    const alive = game.players.filter((p) => !p.out);
    if (alive.length <= 1) {
        const winner = alive[0];
        await sock.sendMessage(game.chatId, {
            text: winner
                ? `🏆 *WCG Winner Board*\n\n🎉 ${mention(winner.jid)} is the winner!`
                : 'No winner this round.',
            mentions: winner ? [winner.jid] : []
        }, quoted ? { quoted } : {});
        stopGame(game.chatId);
        return;
    }

    const idx = nextAliveIndex(game.players, game.currentIndex);
    game.currentIndex = idx;
    const player = game.players[idx];
    game.requiredLetter = pickLetter(game.lastWord, game.mode);

    const turnText = [
        '🎯 *Word Chain Game Turn*',
        `${mention(player.jid)} it's your turn.`,
        `Send a valid English word starting with *${game.requiredLetter.toUpperCase()}*`,
        `Mode: ${game.mode === 'random' ? 'Random Letter' : 'Chain (last letter)'}`,
        `Time limit: 30 minutes`
    ].join('\n');

    await sock.sendMessage(game.chatId, { text: turnText, mentions: [player.jid] }, quoted ? { quoted } : {});

    if (game.turnTimer) clearTimeout(game.turnTimer);
    game.turnTimer = setTimeout(async () => {
        const live = games.get(game.chatId);
        if (!live) return;
        const target = live.players[live.currentIndex];
        if (!target || target.out) return;
        target.out = true;

        await sock.sendMessage(game.chatId, {
            text: `⏰ ${mention(target.jid)} timed out and is disqualified. Moving to next player.`,
            mentions: [target.jid]
        });

        live.currentIndex = (live.currentIndex + 1) % live.players.length;
        await promptTurn(sock, live);
    }, TURN_TIMEOUT_MS);
}

export default {
    name: 'wcg',
    aliases: ['wrg'],
    category: 'games',
    description: 'Word chain game: join in 40s, take turns sending valid words',
    usage: 'wcg <start|easy|hard|end>',
    groupOnly: true,
    cooldown: 3,

    async execute({ sock, message, args, from, sender, prefix }) {
        const rawText = message?.message?.conversation || message?.message?.extendedTextMessage?.text || '';
        const invoked = String(rawText || '').trim().split(/\s+/)[0].replace(prefix, '').toLowerCase();
        const sub = String(args[0] || '').toLowerCase();
        const mode = invoked === 'wrg' ? 'random' : 'chain';

        if (sub === 'end') {
            if (!games.has(from)) {
                return sock.sendMessage(from, { text: '❌ No active WCG game here.' }, { quoted: message });
            }
            stopGame(from);
            return sock.sendMessage(from, { text: '🛑 Word Chain game ended.' }, { quoted: message });
        }

        if (!['start', 'easy', 'hard'].includes(sub)) {
            return sock.sendMessage(from, {
                text: `❌ Usage:\n${prefix}wcg start\n${prefix}wrg start\n${prefix}wcg end\n\nAfter start, users type *join* within 40 seconds.`
            }, { quoted: message });
        }

        if (games.has(from)) {
            return sock.sendMessage(from, { text: '❌ A word game is already running in this group.' }, { quoted: message });
        }

        const game = {
            chatId: from,
            host: sender,
            mode,
            difficulty: sub === 'start' ? 'easy' : sub,
            players: [],
            usedWords: new Set(),
            currentIndex: 0,
            requiredLetter: '',
            lastWord: '',
            joinTimer: null,
            turnTimer: null
        };
        games.set(from, game);

        setChatHandler(from, async (text, incomingMsg) => {
            const live = games.get(from);
            if (!live) return;
            const input = String(text || '').trim();
            const inputLower = input.toLowerCase();
            const actor = senderJid(incomingMsg);
            if (!actor) return;

            if (!live.requiredLetter) {
                if (inputLower !== 'join') return;
                if (live.players.some((p) => p.jid === actor)) return;
                live.players.push({ jid: actor, out: false });
                await sock.sendMessage(from, {
                    text: `✅ ${mention(actor)} joined the game. (${live.players.length} player${live.players.length > 1 ? 's' : ''})`,
                    mentions: [actor]
                }, { quoted: incomingMsg });
                return;
            }

            const turnPlayer = live.players[live.currentIndex];
            if (!turnPlayer || turnPlayer.out || turnPlayer.jid !== actor) return;
            const word = normalizeWord(input);
            if (!word) return;

            if (!word.startsWith(live.requiredLetter)) {
                await sock.sendMessage(from, {
                    text: `❌ ${mention(actor)} word must start with *${live.requiredLetter.toUpperCase()}*.`,
                    mentions: [actor]
                }, { quoted: incomingMsg });
                return;
            }

            if (live.usedWords.has(word)) {
                await sock.sendMessage(from, {
                    text: `❌ ${mention(actor)} that word was already used.`,
                    mentions: [actor]
                }, { quoted: incomingMsg });
                return;
            }

            const ok = await isValidEnglishWord(word);
            if (!ok) {
                await sock.sendMessage(from, {
                    text: `❌ ${mention(actor)} *${word}* is not a valid dictionary word.`,
                    mentions: [actor]
                }, { quoted: incomingMsg });
                return;
            }

            live.usedWords.add(word);
            live.lastWord = word;
            if (live.turnTimer) clearTimeout(live.turnTimer);

            live.currentIndex = (live.currentIndex + 1) % live.players.length;
            await sock.sendMessage(from, {
                text: `✅ ${mention(actor)} accepted: *${word}*`,
                mentions: [actor]
            }, { quoted: incomingMsg });
            await promptTurn(sock, live, incomingMsg);
        });

        await sock.sendMessage(from, {
            text: [
                '🎮 *Word Chain Game Started*',
                `Mode: ${mode === 'random' ? 'Random Letter (WRG)' : 'Word Chain (WCG)'}`,
                `Difficulty: ${game.difficulty}`,
                '',
                'Type *join* now. Join window: 40 seconds.',
                'After join closes, a random player is tagged to start.'
            ].join('\n')
        }, { quoted: message });

        game.joinTimer = setTimeout(async () => {
            const live = games.get(from);
            if (!live) return;

            if (live.players.length < 2) {
                await sock.sendMessage(from, { text: '❌ Not enough players joined (minimum 2).' });
                stopGame(from);
                return;
            }

            live.currentIndex = Math.floor(Math.random() * live.players.length);
            await sock.sendMessage(from, {
                text: `⏳ Join closed with ${live.players.length} players. Starting now...`
            });
            await promptTurn(sock, live);
        }, JOIN_WINDOW_MS);
    }
};
