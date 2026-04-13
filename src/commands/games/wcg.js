import { registerChatHandler, clearChatHandler } from '../../handlers/messageHandler.js';

const sessions = new Map();
const JOIN_WINDOW_MS = 40_000;
const TURN_MS = 20_000;
const MIN_LEN = 3;
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const dictionaryCache = new Map();

function normalizeWord(word) {
    return String(word || '').toLowerCase().replace(/[^a-z]/g, '');
}

function randomLetter() {
    return ALPHA[Math.floor(Math.random() * ALPHA.length)];
}

async function isDictionaryWord(word) {
    if (dictionaryCache.has(word)) return dictionaryCache.get(word);
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (res.status === 429) {
            // Avoid blocking gameplay when dictionary API is rate-limited.
            dictionaryCache.set(word, true);
            return true;
        }
        const ok = res.ok;
        dictionaryCache.set(word, ok);
        return ok;
    } catch {
        // Network failures should not hard-fail active matches.
        dictionaryCache.set(word, true);
        return true;
    }
}

function mentionOf(jid) {
    return `@${jid.split('@')[0]}`;
}

function jidIdentity(jid = '') {
    return String(jid || '')
        .replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '')
        .split(':')[0]
        .replace(/[^0-9]/g, '');
}

function resolveIncomingParticipant(incomingMessage, sock) {
    const key = incomingMessage?.key || {};
    const context = incomingMessage?.message?.extendedTextMessage?.contextInfo
        || incomingMessage?.message?.imageMessage?.contextInfo
        || incomingMessage?.message?.videoMessage?.contextInfo
        || incomingMessage?.message?.documentMessage?.contextInfo
        || incomingMessage?.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo
        || null;

    if (key.fromMe) {
        return key.participant
            || sock?.user?.id
            || sock?.authState?.creds?.me?.id
            || '';
    }

    return key.participant
        || context?.participant
        || (key.remoteJid?.endsWith('@g.us') ? '' : key.remoteJid)
        || '';
}

function nextAliveIndex(players, startIndex) {
    let idx = startIndex;
    for (let i = 0; i < players.length; i++) {
        idx = (idx + 1) % players.length;
        if (!players[idx].out) return idx;
    }
    return -1;
}

async function endGame(sock, from, session, quoted) {
    clearTimeout(session.turnTimer);
    clearChatHandler(from);
    sessions.delete(from);

    const alive = session.players.filter(p => !p.out);
    if (alive.length === 1) {
        const winner = alive[0];
        await sock.sendMessage(from, {
            text: `🏆════════════════════🏆\n   *WORD CHAIN WINNER*\n🏆════════════════════🏆\n\n🎉 Congratulations ${mentionOf(winner.jid)}\nYou are the last player standing!\n\n✅ Total rounds survived: ${winner.rounds}`,
            mentions: [winner.jid]
        }, { quoted });
    } else {
        await sock.sendMessage(from, { text: '🛑 Game ended. No winner this round.' }, { quoted });
    }
}

function armTurnTimer(sock, from, session, quoted) {
    clearTimeout(session.turnTimer);
    session.turnEndsAt = Date.now() + TURN_MS;
    session.turnTimer = setTimeout(async () => {
        const live = sessions.get(from);
        if (!live) return;
        const current = live.players[live.currentIdx];
        if (current && !current.out) {
            current.out = true;
            await sock.sendMessage(from, {
                text: `⌛ ${mentionOf(current.jid)} timed out and is out!`,
                mentions: [current.jid]
            }, { quoted });
        }
        await startTurn(sock, from, live, quoted);
    }, TURN_MS);
}

async function startTurn(sock, from, session, quoted) {
    const aliveCount = session.players.filter(p => !p.out).length;
    if (aliveCount <= 1) {
        return await endGame(sock, from, session, quoted);
    }

    session.currentIdx = nextAliveIndex(session.players, session.currentIdx);
    if (session.currentIdx < 0) {
        return await endGame(sock, from, session, quoted);
    }

    const player = session.players[session.currentIdx];
    const letter = randomLetter();
    session.expected = letter;
    session.waitingFor = player.jid;

    await sock.sendMessage(from, {
        text: `🎯 Turn: ${mentionOf(player.jid)}\nStart with letter: *${letter.toUpperCase()}*\nMinimum letters: *${MIN_LEN}*\n⏳ You have ${TURN_MS / 1000}s`,
        mentions: [player.jid]
    }, { quoted });

    armTurnTimer(sock, from, session, quoted);
}

export default {
    name: 'wcg',
    aliases: ['wordchain', 'chain'],
    category: 'games',
    description: 'Multiplayer Word Chain Game with join window and elimination',
    usage: 'wcg <start|join|status|stop>',
    cooldown: 2,
    args: true,
    minArgs: 1,
    groupOnly: true,

    async execute({ sock, message, args, from, sender }) {
        const action = (args[0] || '').toLowerCase();

        if (action === 'stop') {
            const session = sessions.get(from);
            if (!session) return await sock.sendMessage(from, { text: '❌ No active WCG game.' }, { quoted: message });
            return await endGame(sock, from, session, message);
        }

        if (action === 'status') {
            const session = sessions.get(from);
            if (!session) return await sock.sendMessage(from, { text: '❌ No active WCG game.' }, { quoted: message });
            const alive = session.players.filter(p => !p.out);
            return await sock.sendMessage(from, {
                text: `🎮 *WCG Status*\nPlayers: ${session.players.length}\nAlive: ${alive.length}\nCurrent: ${session.waitingFor ? mentionOf(session.waitingFor) : 'Waiting join phase'}\nExpected letter: ${session.expected?.toUpperCase() || '-'}`,
                mentions: session.waitingFor ? [session.waitingFor] : []
            }, { quoted: message });
        }

        if (action === 'join') {
            const session = sessions.get(from);
            if (!session || session.phase !== 'join') {
                return await sock.sendMessage(from, { text: '❌ Join phase is not active. Use .wcg start first.' }, { quoted: message });
            }
            if (!session.players.some(p => p.jid === sender)) {
                session.players.push({ jid: sender, out: false, rounds: 0 });
            }
            return await sock.sendMessage(from, { text: `✅ ${mentionOf(sender)} joined WCG`, mentions: [sender] }, { quoted: message });
        }

        if (action !== 'start') {
            return await sock.sendMessage(from, { text: 'Use: .wcg start | .wcg join | .wcg status | .wcg stop' }, { quoted: message });
        }

        if (sessions.has(from)) {
            return await sock.sendMessage(from, { text: '❌ A WCG game is already running here.' }, { quoted: message });
        }

        const session = {
            phase: 'join',
            players: [{ jid: sender, out: false, rounds: 0 }],
            currentIdx: -1,
            waitingFor: null,
            expected: null,
            turnTimer: null,
            turnEndsAt: null,
            joinTimer: null
        };
        sessions.set(from, session);

        registerChatHandler(from, {
            command: 'wcg',
            handler: async (text, incomingMessage) => {
                const live = sessions.get(from);
                if (!live) return;
                const participant = resolveIncomingParticipant(incomingMessage, sock);
                const body = (text || '').trim().toLowerCase();

                if (live.phase === 'join' && body === 'join') {
                    if (!live.players.some(p => p.jid === participant)) {
                        live.players.push({ jid: participant, out: false, rounds: 0 });
                        await sock.sendMessage(from, { text: `✅ ${mentionOf(participant)} joined WCG`, mentions: [participant] });
                    }
                    return;
                }

                if (live.phase !== 'play') return;
                if (jidIdentity(participant) !== jidIdentity(live.waitingFor)) return;

                const word = normalizeWord(body);
                if (word.length < MIN_LEN) {
                    return await sock.sendMessage(from, { text: `❌ Word must be at least ${MIN_LEN} letters.` });
                }
                if (!word.startsWith(live.expected)) {
                    return await sock.sendMessage(from, { text: `❌ Word must start with *${live.expected.toUpperCase()}*.` });
                }

                // Stop timeout while dictionary validation is in-flight so valid answers are not timed out.
                clearTimeout(live.turnTimer);
                const valid = await isDictionaryWord(word);
                if (!valid) {
                    armTurnTimer(sock, from, live, message);
                    return await sock.sendMessage(from, { text: '❌ Not in my word list (dictionary check failed).' });
                }

                const current = live.players[live.currentIdx];
                current.rounds += 1;
                await sock.sendMessage(from, { text: `✅ ${mentionOf(participant)} accepted: *${word}*`, mentions: [participant] });
                await startTurn(sock, from, live, message);
            }
        }, 20 * 60_000);

        await sock.sendMessage(from, {
            text: `🎮 *WCG STARTED*\n\nType *join* in the next 40 seconds to participate.\nStarter: ${mentionOf(sender)}`,
            mentions: [sender]
        }, { quoted: message });

        setTimeout(() => {
            if (!sessions.has(from)) return;
            const s = sessions.get(from);
            if (s?.phase === 'join') {
                sock.sendMessage(from, { text: '⏳ 30 seconds remaining to join. Type *join* now!' }).catch(() => {});
            }
        }, 10_000);

        setTimeout(() => {
            if (!sessions.has(from)) return;
            const s = sessions.get(from);
            if (s?.phase === 'join') {
                sock.sendMessage(from, { text: '⏳ 10 seconds remaining to join. Type *join* now!' }).catch(() => {});
            }
        }, 30_000);

        session.joinTimer = setTimeout(async () => {
            const live = sessions.get(from);
            if (!live) return;
            if (live.players.length < 2) {
                await sock.sendMessage(from, { text: '❌ Need at least 2 players. Game cancelled.' }, { quoted: message });
                sessions.delete(from);
                clearChatHandler(from);
                return;
            }
            live.phase = 'play';
            await sock.sendMessage(from, {
                text: `🚀 Join closed. Starting game with ${live.players.length} players:\n${live.players.map((p, i) => `${i + 1}. ${mentionOf(p.jid)}`).join('\n')}`,
                mentions: live.players.map(p => p.jid)
            }, { quoted: message });
            await startTurn(sock, from, live, message);
        }, JOIN_WINDOW_MS);
    }
};
