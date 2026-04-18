import { createCanvas } from '@napi-rs/canvas';

const sessions = new Map();
const TTL = 10 * 60 * 1000;

function markOf(jid, session) {
    if (jid === session.playerX) return 'X';
    if (jid === session.playerO) return 'O';
    return '';
}

function renderBoardImage(session, title = 'Tic Tac Toe') {
    const canvas = createCanvas(900, 900);
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 900, 900);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 900);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 58px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 450, 90);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.strokeRect(150, 150, 600, 600);
    for (let i = 1; i < 3; i += 1) {
        const p = 150 + (i * 200);
        ctx.beginPath();
        ctx.moveTo(p, 150);
        ctx.lineTo(p, 750);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(150, p);
        ctx.lineTo(750, p);
        ctx.stroke();
    }

    ctx.font = 'bold 72px sans-serif';
    for (let i = 0; i < 9; i += 1) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 250 + (col * 200);
        const y = 280 + (row * 200);
        const v = session.board[i];
        if (v === 'X') ctx.fillStyle = '#22d3ee';
        else if (v === 'O') ctx.fillStyle = '#fbbf24';
        else ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(v || String(i + 1), x, y);
    }

    return canvas.toBuffer('image/png');
}

function winner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
    }
    return '';
}

function mention(jid) {
    return `@${String(jid || '').split('@')[0]}`;
}

function clearSession(from) {
    const s = sessions.get(from);
    if (s?.timer) clearTimeout(s.timer);
    sessions.delete(from);
}

function armExpiry(from) {
    const s = sessions.get(from);
    if (!s) return;
    if (s.timer) clearTimeout(s.timer);
    s.timer = setTimeout(() => clearSession(from), TTL);
}

async function sendBoard(sock, from, quoted, session, text, buttons = []) {
    const buffer = renderBoardImage(session);
    if (buttons.length) {
        return sock.sendMessage(from, {
            image: buffer,
            caption: text,
            footer: 'TicTacToe',
            buttons,
            headerType: 4,
            mentions: [session.playerX, session.playerO]
        }, { quoted });
    }
    return sock.sendMessage(from, { image: buffer, caption: text, mentions: [session.playerX, session.playerO] }, { quoted });
}

export default {
    name: 'tictactoe',
    aliases: ['ttt'],
    category: 'games',
    description: 'Play multiplayer Tic Tac Toe with canvas board',
    usage: 'tictactoe <@user|number|stop>',
    cooldown: 2,
    groupOnly: true,
    minArgs: 0,

    async execute({ sock, message, args, from, sender, prefix }) {
        const cmd = String(args[0] || '').toLowerCase();
        if (cmd === 'stop') {
            if (!sessions.has(from)) {
                return sock.sendMessage(from, { text: '❌ No active tic tac toe game.' }, { quoted: message });
            }
            clearSession(from);
            return sock.sendMessage(from, { text: '🛑 Tic Tac Toe stopped.' }, { quoted: message });
        }

        if (sessions.has(from)) {
            return sock.sendMessage(from, { text: '❌ A Tic Tac Toe game is already active in this chat.' }, { quoted: message });
        }

        const ctx = message.message?.extendedTextMessage?.contextInfo || {};
        const challenger = sender;
        const opponent = ctx.mentionedJid?.[0]
            || (ctx.participant && ctx.participant !== sender ? ctx.participant : '');
        if (!opponent || opponent === challenger) {
            return sock.sendMessage(from, {
                text: `❌ Mention or reply to the second player.\nExample: ${prefix}tictactoe @user`
            }, { quoted: message });
        }

        const session = {
            playerX: challenger,
            playerO: opponent,
            turn: 'X',
            board: Array(9).fill(''),
            timer: null
        };
        sessions.set(from, session);
        armExpiry(from);

        const intro = [
            '🎮 *Tic Tac Toe Started*',
            `${mention(challenger)} = ❌`,
            `${mention(opponent)} = ⭕`,
            '',
            `Reply with a number *1-9* to place your move.`,
            `First turn: ${mention(challenger)} (X)`
        ].join('\n');
        const sent = await sendBoard(sock, from, message, session, intro);

        if (!global.replyHandlers) global.replyHandlers = {};
        const register = (msgId) => {
            global.replyHandlers[msgId] = {
                command: 'tictactoe',
                handler: async (replyText, replyMessage) => {
                    const live = sessions.get(from);
                    if (!live) return;
                    armExpiry(from);

                    const btn = replyMessage.message?.buttonsResponseMessage?.selectedButtonId || '';
                    const moveText = (btn.replace(/^TTT_/, '') || replyText || '').trim().toUpperCase();
                    const actor = replyMessage.key.participant || replyMessage.key.remoteJid;
                    const actorMark = markOf(actor, live);
                    if (!actorMark) return;

                    if (moveText === 'STOP') {
                        clearSession(from);
                        return sock.sendMessage(from, { text: '🛑 Tic Tac Toe stopped.' }, { quoted: replyMessage });
                    }
                    if (moveText === 'CONTINUE') {
                        const turnJid = live.turn === 'X' ? live.playerX : live.playerO;
                        const continued = await sendBoard(sock, from, replyMessage, live, `▶️ Continue game.\nTurn: ${mention(turnJid)} (${live.turn})`);
                        register(continued.key.id);
                        return;
                    }

                    const pos = Number.parseInt(moveText, 10);
                    if (Number.isNaN(pos) || pos < 1 || pos > 9) return;
                    if (actorMark !== live.turn) return;
                    if (live.board[pos - 1]) return;

                    live.board[pos - 1] = actorMark;
                    const won = winner(live.board);
                    const filled = live.board.every(Boolean);

                    if (won) {
                        const winnerJid = won === 'X' ? live.playerX : live.playerO;
                        const msg = await sendBoard(sock, from, replyMessage, live, `🏆 Winner: ${mention(winnerJid)} (${won})`);
                        clearSession(from);
                        delete global.replyHandlers[msg.key.id];
                        return;
                    }

                    if (filled) {
                        const msg = await sendBoard(
                            sock, from, replyMessage, live,
                            '🤝 Draw game.\nUse buttons below to continue or stop.',
                            [
                                { buttonId: 'TTT_CONTINUE', buttonText: { displayText: 'Continue' }, type: 1 },
                                { buttonId: 'TTT_STOP', buttonText: { displayText: 'Stop' }, type: 1 }
                            ]
                        );
                        register(msg.key.id);
                        return;
                    }

                    live.turn = live.turn === 'X' ? 'O' : 'X';
                    const turnJid = live.turn === 'X' ? live.playerX : live.playerO;
                    const next = await sendBoard(sock, from, replyMessage, live, `✅ Move accepted.\nTurn: ${mention(turnJid)} (${live.turn})`);
                    register(next.key.id);
                }
            };
        };

        register(sent.key.id);
    }
};
