import fs from 'fs-extra';
import path from 'path';
import P from 'pino';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } from '@whiskeysockets/baileys';

const PAIRING_SESSIONS_PATH = path.join(process.cwd(), 'cache', 'paired_sessions');
const activePairingSockets = new Map();

function normalizeNumber(value = '') {
    const clean = String(value || '').replace(/\D/g, '');
    if (clean.length < 10 || clean.length > 15) return null;
    return clean;
}

function formatCode(code = '') {
    return code?.match(/.{1,4}/g)?.join('-') || code;
}

async function createPairingSocket(authDir) {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const browserProfile = typeof Browsers?.ubuntu === 'function'
        ? Browsers.ubuntu('Chrome')
        : Browsers.macOS('Chrome');

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' }).child({ level: 'fatal' }))
        },
        printQRInTerminal: false,
        browser: browserProfile,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 250,
        generateHighQualityLinkPreview: false,
        logger: P({ level: 'silent' }),
        version,
        getMessage: async () => ({ conversation: '' })
    });

    sock.ev.on('creds.update', saveCreds);
    return sock;
}

async function isAlreadyRegistered(authDir) {
    const credsFile = path.join(authDir, 'creds.json');
    if (!await fs.pathExists(credsFile)) return false;
    try {
        const creds = await fs.readJSON(credsFile);
        return creds?.registered === true;
    } catch {
        return false;
    }
}

function sessionDirForNumber(number) {
    return path.join(PAIRING_SESSIONS_PATH, number);
}

function attachSessionLifecycle(number, sock) {
    activePairingSockets.set(number, sock);
    sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            activePairingSockets.set(number, sock);
        }
        if (connection === 'close') {
            activePairingSockets.delete(number);
        }
    });
}

export async function generatePairingCode(rawNumber, { timeoutMs = 90000 } = {}) {
    const number = normalizeNumber(rawNumber);
    if (!number) {
        throw new Error('Invalid phone number. Use 10-15 digits with country code.');
    }

    const authDir = sessionDirForNumber(number);
    await fs.ensureDir(authDir);
    await fs.ensureDir(path.join(authDir, 'keys'));

    if (await isAlreadyRegistered(authDir)) {
        throw new Error('This number already has a saved paired session.');
    }

    let sock = null;
    let timeoutHandle = null;

    try {
        sock = await createPairingSocket(authDir);
        attachSessionLifecycle(number, sock);

        const code = await new Promise((resolve, reject) => {
            let settled = false;
            const finish = (fn, payload) => {
                if (settled) return;
                settled = true;
                fn(payload);
            };

            timeoutHandle = setTimeout(() => {
                finish(reject, new Error('Timed out while generating pair code. Try again.'));
            }, timeoutMs);

            sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
                if (connection === 'close' && !settled) {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    finish(reject, new Error(`Pairing connection closed (${statusCode ?? 'unknown'}).`));
                }
            });

            setTimeout(async () => {
                try {
                    const rawCode = await sock.requestPairingCode(number);
                    finish(resolve, formatCode(rawCode));
                } catch (error) {
                    finish(reject, error);
                }
            }, 1800);
        });

        return { number, code, sessionPath: authDir };
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
    }
}

export async function startSavedPairedSessions() {
    await fs.ensureDir(PAIRING_SESSIONS_PATH);
    const entries = await fs.readdir(PAIRING_SESSIONS_PATH).catch(() => []);

    for (const entry of entries) {
        const number = normalizeNumber(entry);
        if (!number || activePairingSockets.has(number)) continue;

        const authDir = sessionDirForNumber(number);
        if (!await isAlreadyRegistered(authDir)) continue;

        try {
            const sock = await createPairingSocket(authDir);
            attachSessionLifecycle(number, sock);
        } catch {
            // Ignore broken session dirs; user can re-pair that number.
        }
    }
}
