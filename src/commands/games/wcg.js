import axios from 'axios';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const JOIN_WINDOW_MS = 60_000;
const TURN_TIMEOUT_MS = 40_000;
const MIN_PLAYERS = 2;
const DEFAULT_MIN_WORD_LENGTH = 3;

const games = new Map();

const LOCAL_WORDS = new Set([
    'apple', 'ant', 'alpha', 'arrow', 'angle', 'banana', 'band', 'beach', 'breeze', 'cat', 'camel',
    'circle', 'delta', 'dream', 'dusk', 'echo', 'eagle', 'flame', 'forest', 'glory', 'grace', 'happy',
    'honey', 'island', 'jungle', 'king', 'lemon', 'magic', 'night', 'ocean', 'power', 'queen', 'river',
    'stone', 'tiger', 'unity', 'valor', 'water', 'world', 'xenon', 'youth', 'zebra'
]);

function mention(jid = '') {
    return `@${String(jid).split('@')[0]}`;
}

function normalizeWord(input = '') {
    return String(input).trim().toLowerCase().replace(/[^a-z]/g, '');
}

function isJoinMessage(input = '') {
    const compact = String(input).trim().toLowerCase().replace(/[^a-z]/g, '');
    return compact === 'join';
}

function extractParticipantJid(message) {
    const raw = message?.key?.participant
        || message?.participant
        || message?.sender
        || '';

    if (typeof raw === 'string' && raw && !raw.endsWith('@g.us')) return raw;

    const remote = message?.key?.remoteJid || '';
    if (typeof remote === 'string' && remote && !remote.endsWith('@g.us')) return remote;

    return '';
}

function setChatHandler(chatId, handler) {
    if (!global.chatHandlers) global.chatHandlers = {};
    global.chatHandlers[chatId] = { command: 'wcg', handler };
}

function clearChatHandler(chatId) {
    if (global.chatHandlers?.[chatId]) delete global.chatHandlers[chatId];
}

function nextAliveIndex(players, startIndex) {
    if (!Array.isArray(players) || !players.length) return -1;
    for (let i = 0; i < players.length; i += 1) {
        const idx = (startIndex + i) % players.length;
        if (!players[idx].out) return idx;
    }
    return -1;
}

function pickRequiredLetter(lastWord, mode) {
    if (mode === 'chain' && lastWord) return lastWord.at(-1);
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    return letters[Math.floor(Math.random() * letters.length)];
}

function stopGame(chatId) {
    const game = games.get(chatId);
    if (!game) return;
    if (game.joinTimer) clearTimeout(game.joinTimer);
    if (game.turnTimer) clearTimeout(game.turnTimer);
    clearChatHandler(chatId);
    games.delete(chatId);
}

async function isValidEnglishWord(word) {
    if (!word || word.length < 2) return false;
    if (LOCAL_WORDS.has(word)) return true;
    try {
        const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 12_000 });
        return Array.isArray(data) && data.length > 0;
    } catch {
        return false;
    }
}

async function getProfilePicBuffer(sock, jid) {
    try {
        const ppUrl = await sock.profilePictureUrl(jid, 'image');
        if (!ppUrl) return null;
        const { data } = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 12_000 });
        return Buffer.from(data);
    } catch {
        return null;
    }
}

async function makeWinnerCanvas(name, avatarBuffer) {
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#111827');
    bg.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(60, 60, width - 120, height - 120);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 58px Sans';
    ctx.fillText('🏆 WORD CHAIN CHAMPION', 320, 150);

    const x = 120;
    const y = 170;
    const size = 290;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (avatarBuffer) {
        const img = await loadImage(avatarBuffer);
        ctx.drawImage(img, x, y, size, size);
    } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 120px Sans';
        ctx.fillText('👤', x + 90, y + 195);
    }

    ctx.restore();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 54px Sans';
    ctx.fillText(name || 'Winner', 460, 285);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '34px Sans';
    ctx.fillText('Champion of this game', 460, 340);

    return canvas.toBuffer('image/png');
}

async function announceWinner(sock, game, winner, quoted) {
    const longestWord = game.longestWord?.word;
    const longestBy = game.longestWord?.jid;
    const mentions = [winner.jid, ...(longestBy ? [longestBy] : [])];

    let winnerName = 'Winner';
    try {
        winnerName = await sock.getName(winner.jid);
    } catch {}

    const avatarBuffer = await getProfilePicBuffer(sock, winner.jid);
    const card = await makeWinnerCanvas(winnerName, avatarBuffer);

    const lines = [
        '🏆 *WCG Winner Board*',
        `🎉 Winner: ${mention(winner.jid)}`,
        longestWord ? `🔠 Longest Word: *${longestWord}* (${mention(longestBy)})` : '🔠 Longest Word: None submitted'
    ];

    await sock.sendMessage(game.chatId, {
        image: card,
        caption: lines.join('\n'),
        mentions
    }, quoted ? { quoted } : {});
}

async function sendTurnPrompt(sock, game, quoted = null) {
    const alive = game.players.filter((player) => !player.out);
    if (alive.length <= 1) {
        const winner = alive[0];
        if (!winner) {
            await sock.sendMessage(game.chatId, { text: 'No winner this round.' }, quoted ? { quoted } : {});
            stopGame(game.chatId);
            return;
        }

        await announceWinner(sock, game, winner, quoted);
        stopGame(game.chatId);
        return;
    }

    const idx = nextAliveIndex(game.players, game.currentIndex);
    if (idx < 0) {
        stopGame(game.chatId);
        return;
    }

    game.currentIndex = idx;
    game.requiredLetter = pickRequiredLetter(game.lastWord, game.mode);

    const player = game.players[idx];
    const nextIdx = nextAliveIndex(game.players, (idx + 1) % game.players.length);
    const nextPlayer = nextIdx >= 0 ? game.players[nextIdx] : null;

    const text = [
        `🎲Turn : ${mention(player.jid)}`,
        `🙌Next : ${nextPlayer ? mention(nextPlayer.jid) : 'N/A'}`,
        `🆎Starts with ${game.requiredLetter.toUpperCase()} (at least ${game.minWordLength} letters)`,
        `🏆Players left : ${alive.length}/${game.players.length}`,
        `⏳ You have *${Math.floor(TURN_TIMEOUT_MS / 1000)}* seconds to reply`,
        `📝Total words : ${game.usedWords.size}`
    ].join('\n');

    const mentions = [player.jid, ...(nextPlayer ? [nextPlayer.jid] : [])];
    await sock.sendMessage(game.chatId, { text, mentions }, quoted ? { quoted } : {});

    if (game.turnTimer) clearTimeout(game.turnTimer);
    game.turnTimer = setTimeout(async () => {
        const live = games.get(game.chatId);
        if (!live) return;

        const current = live.players[live.currentIndex];
        if (!current || current.out) return;

        current.out = true;
        await sock.sendMessage(game.chatId, {
            text: `⏰ ${mention(current.jid)} failed to reply in ${Math.floor(TURN_TIMEOUT_MS / 1000)} seconds and is out.`,
            mentions: [current.jid]
        });

        live.currentIndex = (live.currentIndex + 1) % live.players.length;
        await sendTurnPrompt(sock, live);
    }, TURN_TIMEOUT_MS);
}

export default {
    name: 'wcg',
    aliases: ['wrg'],
    category: 'games',
    description: 'Word chain game with join phase, turn timers, and winner board',
    usage: 'wcg <start|easy|hard|end>',
    groupOnly: true,
    cooldown: 3,

    async execute({ sock, message, args, from, sender, prefix }) {
        const rawText = message?.message?.conversation || message?.message?.extendedTextMessage?.text || '';
        const invoked = String(rawText).trim().split(/\s+/)[0].replace(prefix, '').toLowerCase();
        const sub = String(args[0] || '').toLowerCase();
        const requested = String(args[1] || '').toLowerCase();
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
                text: `❌ Usage:\n${prefix}wcg start\n${prefix}wcg start hard\n${prefix}wrg start\n${prefix}wcg end\n\nAfter start, users type *join* within ${Math.floor(JOIN_WINDOW_MS / 1000)} seconds.`
            }, { quoted: message });
        }

        if (games.has(from)) {
            return sock.sendMessage(from, { text: '❌ A word game is already running in this group.' }, { quoted: message });
        }

        const game = {
            chatId: from,
            host: sender,
            mode,
            difficulty: sub === 'start' ? (requested === 'hard' ? 'hard' : 'easy') : sub,
            players: [],
            usedWords: new Set(),
            longestWord: null,
            currentIndex: 0,
            requiredLetter: '',
            lastWord: '',
            joinTimer: null,
            turnTimer: null,
            round: 0,
            minWordLength: DEFAULT_MIN_WORD_LENGTH
        };

        games.set(from, game);

        setChatHandler(from, async (text, incomingMessage) => {
            const live = games.get(from);
            if (!live) return;

            const actor = extractParticipantJid(incomingMessage);
            if (!actor) return;

            const input = String(text || '').trim();
            const word = normalizeWord(input);

            // Join phase
            if (!live.requiredLetter) {
                if (!isJoinMessage(input)) return;
                if (live.players.some((player) => player.jid === actor)) return;
                live.players.push({ jid: actor, out: false });
                return;
            }

            // Turn phase
            const turnPlayer = live.players[live.currentIndex];
            if (!turnPlayer || turnPlayer.out || turnPlayer.jid !== actor) return;
            if (!word) return;

            if (!word.startsWith(live.requiredLetter)) {
                await sock.sendMessage(from, {
                    text: `❌ ${mention(actor)} word must start with *${live.requiredLetter.toUpperCase()}*.`,
                    mentions: [actor]
                }, { quoted: incomingMessage });
                return;
            }

            if (word.length < live.minWordLength) {
                await sock.sendMessage(from, {
                    text: `❌ ${mention(actor)} your word must be at least *${live.minWordLength}* letters (you sent ${word.length}).`,
                    mentions: [actor]
                }, { quoted: incomingMessage });
                return;
            }

            if (live.usedWords.has(word)) {
                await sock.sendMessage(from, {
                    text: `❌ ${mention(actor)} that word was already used.`,
                    mentions: [actor]
                }, { quoted: incomingMessage });
                return;
            }

            const valid = await isValidEnglishWord(word);
            if (!valid) {
                await sock.sendMessage(from, {
                    text: `❌ ${mention(actor)} *${word}* is not a valid dictionary word.`,
                    mentions: [actor]
                }, { quoted: incomingMessage });
                return;
            }

            live.usedWords.add(word);
            live.lastWord = word;
            live.round += 1;

            if (!live.longestWord || word.length > live.longestWord.word.length) {
                live.longestWord = { word, jid: actor };
            }

            if (live.turnTimer) clearTimeout(live.turnTimer);

            live.currentIndex = (live.currentIndex + 1) % live.players.length;
            await sock.sendMessage(from, {
                text: `✅ ${mention(actor)} accepted: *${word}*\n🔢 Round: ${live.round}\n📏 Minimum length: ${live.minWordLength}`,
                mentions: [actor]
            }, { quoted: incomingMessage });

            await sendTurnPrompt(sock, live, incomingMessage);
        });

        await sock.sendMessage(from, {
            text: [
                '🎮 Game starting...',
                `👥 Need ${MIN_PLAYERS} or more players`,
                `⏳ You have ${Math.floor(JOIN_WINDOW_MS / 1000)} seconds to join ⏳`,
                `🧩 Mode ${game.difficulty}`,
                '',
                'Examples:',
                '- wcg start (force start the word chain game)',
                '- wcg end (end the current game)',
                'Default mode is easy.',
                '',
                '🎮 Game starts in 30 seconds ⏳',
                'Type *join* to play 🙋‍♂️🙋‍♀️',
                `🧩 Mode ${game.difficulty}`
            ].join('\n')
        }, { quoted: message });

        game.joinTimer = setTimeout(async () => {
            const live = games.get(from);
            if (!live) return;

            if (live.players.length < MIN_PLAYERS) {
                await sock.sendMessage(from, { text: `❌ Not enough players joined (minimum ${MIN_PLAYERS}).` });
                stopGame(from);
                return;
            }

            live.currentIndex = Math.floor(Math.random() * live.players.length);
            await sock.sendMessage(from, { text: `👥 ${live.players.length} players joined.` });
            await sendTurnPrompt(sock, live);
        }, JOIN_WINDOW_MS);
    }
};
