import fs from 'fs-extra';
import path from 'path';
import P from 'pino';
import pn from 'awesome-phonenumber';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } from '@whiskeysockets/baileys';

const PAIRING_SESSIONS_PATH = path.join(process.cwd(), 'cache', 'paired_sessions');
const activePairingSockets = new Map();

function normalizeNumber(value = '') {
    const clean = String(value || '').replace(/\D/g, '');
    if (clean.length < 10 || clean.length > 15) return null;
    const parsed = pn(`+${clean}`);
    if (!parsed?.isValid?.()) return null;
    return parsed.getNumber('e164').replace('+', '');
}

function formatCode(code = '') {
    return code?.match(/.{1,4}/g)?.join('-') || code;
}

async function createPairingSocket(authDir) {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1025091844] }));

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

function waitForPairingReady(sock, timeoutMs = 20000) {
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve();
        };

        const timer = setTimeout(finish, timeoutMs);
        sock.ev.on('connection.update', ({ connection }) => {
            if (connection === 'connecting' || connection === 'open') {
                finish();
            }
        });
    });
}

async function requestPairingCodeWithRetry(sock, number, retries = 3) {
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const rawCode = await sock.requestPairingCode(number);
            if (!rawCode) throw new Error('Pairing API returned an empty code');
            return rawCode;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
            }
        }
    }
    throw lastError || new Error('Could not generate pairing code');
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

function sessionDirForId(sessionId) {
    return path.join(PAIRING_SESSIONS_PATH, sessionId);
}

function createSessionId(number) {
    return `${number}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function writeSessionMeta(authDir, number) {
    await fs.writeJSON(path.join(authDir, 'pairing-meta.json'), {
        number,
        createdAt: new Date().toISOString()
    }, { spaces: 2 });
}

function attachSessionLifecycle(sessionId, sock) {
    activePairingSockets.set(sessionId, sock);
    sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            activePairingSockets.set(sessionId, sock);
        }
        if (connection === 'close') {
            activePairingSockets.delete(sessionId);
        }
    });
}

export async function generatePairingCode(rawNumber, {
    timeoutMs = 90000,
    onCodeSent = null,
    onLinked = null
} = {}) {
    const number = normalizeNumber(rawNumber);
    if (!number) {
        throw new Error('Invalid phone number. Use 10-15 digits with country code.');
    }

    const sessionId = createSessionId(number);
    const authDir = sessionDirForId(sessionId);
    await fs.ensureDir(authDir);
    await fs.ensureDir(path.join(authDir, 'keys'));
    await writeSessionMeta(authDir, number);

    let sock = null;
    let timeoutHandle = null;

    try {
        sock = await createPairingSocket(authDir);
        attachSessionLifecycle(sessionId, sock);

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
                if (connection === 'open') {
                    try {
                        await onLinked?.({ number, sessionPath: authDir });
                    } catch {
                        // Ignore callback errors so pairing lifecycle can continue.
                    }
                }
                if (connection === 'close' && !settled) {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    finish(reject, new Error(`Pairing connection closed (${statusCode ?? 'unknown'}).`));
                }
            });

            setTimeout(async () => {
                try {
                    await waitForPairingReady(sock, 20000);
                    const rawCode = await requestPairingCodeWithRetry(sock, number, 3);
                    const code = formatCode(rawCode);
                    try {
                        await onCodeSent?.({ number, code, sessionPath: authDir });
                    } catch {
                        // Ignore callback errors so pair code can still be returned.
                    }
                    finish(resolve, code);
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
        const authDir = sessionDirForId(entry);
        if (activePairingSockets.has(entry)) continue;
        if (!await isAlreadyRegistered(authDir)) continue;

        try {
            const sock = await createPairingSocket(authDir);
            attachSessionLifecycle(entry, sock);
        } catch {
            // Ignore broken session dirs; user can re-pair that number.
        }
    }
}

export async function clearAllPairedSessions() {
    for (const [, sock] of activePairingSockets.entries()) {
        try {
            if (typeof sock?.end === 'function') sock.end(new Error('Clearing paired sessions by admin request'));
        } catch {
            // Ignore socket shutdown failures during cleanup.
        }
    }
    activePairingSockets.clear();

    await fs.remove(PAIRING_SESSIONS_PATH);
    await fs.ensureDir(PAIRING_SESSIONS_PATH);
}
