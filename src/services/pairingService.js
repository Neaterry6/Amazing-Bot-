import fs from 'fs-extra';
import path from 'path';
import P from 'pino';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } from '@whiskeysockets/baileys';

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

export async function generatePairingCode(rawNumber, { timeoutMs = 45000 } = {}) {
    const number = normalizeNumber(rawNumber);
    if (!number) {
        throw new Error('Invalid phone number. Use 10-15 digits with country code.');
    }

    const authDir = path.join(process.cwd(), 'cache', 'pairing_auth', `${number}_${Date.now()}`);
    await fs.ensureDir(authDir);

    let sock = null;
    let timeoutHandle = null;

    const cleanup = async () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (sock) {
            try { sock.ev.removeAllListeners(); } catch {}
            try { sock.ws?.close?.(); } catch {}
            sock = null;
        }
        await fs.remove(authDir).catch(() => {});
    };

    try {
        sock = await createPairingSocket(authDir);

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

        return { number, code };
    } finally {
        await cleanup();
    }
}
