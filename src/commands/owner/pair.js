import fs from 'fs-extra';
import path from 'path';

const SESSION_PATH = path.join(process.cwd(), 'cache', 'auth_info_baileys');
const PAIR_TIMEOUT_MS = 3 * 60 * 1000;

async function buildSessionIdFromLocalAuth() {
    const credsPath = path.join(SESSION_PATH, 'creds.json');
    if (!await fs.pathExists(credsPath)) return null;

    const creds = await fs.readJSON(credsPath);
    const keysDir = path.join(SESSION_PATH, 'keys');
    const keys = {};

    if (await fs.pathExists(keysDir)) {
        const keyFiles = await fs.readdir(keysDir);
        for (const kf of keyFiles) {
            if (!kf.endsWith('.json')) continue;
            const keyName = kf.replace(/\.json$/, '');
            keys[keyName] = await fs.readJSON(path.join(keysDir, kf)).catch(() => null);
        }
    }

    return `Ilom~${Buffer.from(JSON.stringify({ creds, keys }), 'utf8').toString('base64')}`;
}

async function persistGeneratedSessionId(sessionId) {
    await fs.ensureDir(path.join(process.cwd(), 'data'));
    await fs.writeFile(path.join(process.cwd(), 'data', 'generated_session_id.txt'), sessionId, 'utf8');

    const envPath = path.join(process.cwd(), '.env');
    if (await fs.pathExists(envPath)) {
        const envRaw = await fs.readFile(envPath, 'utf8');
        if (/^SESSION_ID=/m.test(envRaw)) {
            const updated = envRaw.replace(/^SESSION_ID=.*$/m, `SESSION_ID=${sessionId}`);
            await fs.writeFile(envPath, updated, 'utf8');
        } else {
            await fs.appendFile(envPath, `\nSESSION_ID=${sessionId}\n`, 'utf8');
        }
    }
}

function registerReplyHandler(messageId, handler) {
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[messageId] = { command: 'pair', handler };
    setTimeout(() => {
        if (global.replyHandlers?.[messageId]) delete global.replyHandlers[messageId];
    }, 10 * 60 * 1000);
}

async function getNumberFromInput(raw = '') {
    const normalized = String(raw || '').replace(/\D/g, '');
    return normalized.length >= 10 ? normalized : null;
}

async function waitForPairCompletion({ sock, from, message, number }) {
    const start = Date.now();
    const initialSession = await buildSessionIdFromLocalAuth();

    while (Date.now() - start < PAIR_TIMEOUT_MS) {
        await new Promise(r => setTimeout(r, 5000));
        const nextSession = await buildSessionIdFromLocalAuth();
        if (!nextSession) continue;
        if (nextSession !== initialSession || sock?.authState?.creds?.registered) {
            await persistGeneratedSessionId(nextSession).catch(() => {});
            await sock.sendMessage(from, {
                text: `✅ Pairing completed for +${number}.\n\nSession deployed automatically.\nSaved to:\n• data/generated_session_id.txt\n• .env (SESSION_ID)\n\nSESSION_ID:\n${nextSession}`
            }, { quoted: message });
            return true;
        }
    }

    await sock.sendMessage(from, {
        text: '⚠️ Pair code sent, but pairing confirmation timed out. You can run *pair* again after linking.'
    }, { quoted: message });
    return false;
}

export default {
    name: 'pair',
    aliases: ['paircode', 'linkuser'],
    category: 'owner',
    description: 'Ask for number, generate pairing code, and auto-save linked session',
    usage: 'pair [countrycodenumber]',
    ownerOnly: true,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from }) {
        let number = await getNumberFromInput(args[0] || '');
        if (!number) {
            const ask = await sock.sendMessage(from, {
                text: '📱 Send the user number with country code.\nExample: 2349019185242'
            }, { quoted: message });

            registerReplyHandler(ask.key.id, async (replyText, replyMessage) => {
                const repliedNumber = await getNumberFromInput(replyText || '');
                if (!repliedNumber) {
                    return await sock.sendMessage(from, { text: '❌ Invalid number. Use format: 2349019185242' }, { quoted: replyMessage });
                }
                await this.execute({ sock, message: replyMessage, args: [repliedNumber], from });
            });
            return;
        }

        for (let i = 1; i <= 5; i++) {
            try {
                const rawCode = await sock.requestPairingCode(number);
                const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
                await sock.sendMessage(from, {
                    text: `🔐 Pair code for +${number}:\n*${code}*\n\nGo to WhatsApp > Linked devices > Link with phone number.`
                }, { quoted: message });

                await waitForPairCompletion({ sock, from, message, number });
                return;
            } catch (error) {
                if (i === 5) {
                    return await sock.sendMessage(from, { text: `❌ Pair failed: ${error.message}` }, { quoted: message });
                }
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }
};
