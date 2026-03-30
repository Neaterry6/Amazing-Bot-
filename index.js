import './src/utils/loadEnv.js';
import P from 'pino';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline/promises';
import NodeCache from 'node-cache';
import chalk from 'chalk';
import figlet from 'figlet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { connectToDatabase } from './src/utils/database.js';
import logger from './src/utils/logger.js';
import { messageHandler } from './src/handlers/messageHandler.js';
import { commandHandler } from './src/handlers/commandHandler.js';
import eventHandler from './src/handlers/eventHandler.js';
import callHandler from './src/handlers/callHandler.js';
import groupHandler from './src/handlers/groupHandler.js';
import errorHandler from './src/handlers/errorHandler.js';
import config from './src/config.js';
import constants from './src/constants.js';
import { loadPlugins, getActiveCount } from './src/utils/pluginManager.js';
import { startScheduler } from './src/utils/scheduler.js';
import { initializeCache } from './src/utils/cache.js';
import { startWebServer } from './src/utils/webServer.js';
import qrService from './src/services/qrService.js';
import Settings from './src/models/Settings.js';

global._config = config;

const msgRetryCounterCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });
const app = express();
let sock = null;
let isShuttingDown = false;
let connectionTimeout = null;
let reconnectAttempts = 0;
let cachedPairingNumber = null;

const SESSION_PATH = path.join(process.cwd(), 'cache', 'auth_info_baileys');
const MAX_RECONNECT = 10;
const RECONNECT_DELAYS = [3000, 5000, 10000, 15000, 20000, 30000, 30000, 30000, 30000, 30000];

const W = 65;
const line  = chalk.hex('#8B5CF6')('═'.repeat(W));
const tline = chalk.hex('#6D28D9')('─'.repeat(W));

function getSessionIdentifier() {
    return (
        process.env.SESSION_ID ||
        process.env.WA_SESSION_ID ||
        process.env.ILOMBOT_SESSION_ID ||
        config.session?.sessionId ||
        ''
    ).trim().replace(/^['"]|['"]$/g, '');
}

function box(content) {
    console.log(chalk.hex('#8B5CF6')('╔' + '═'.repeat(W) + '╗'));
    for (const row of content) {
        const visible = row.replace(/\x1B\[[0-9;]*m/g, '');
        const pad = W - visible.length;
        console.log(chalk.hex('#8B5CF6')('║') + row + ' '.repeat(Math.max(0, pad)) + chalk.hex('#8B5CF6')('║'));
    }
    console.log(chalk.hex('#8B5CF6')('╚' + '═'.repeat(W) + '╝'));
}

function step(icon, label, value) {
    const lbl = chalk.hex('#C4B5FD')(label.padEnd(22));
    const val = value ? chalk.whiteBright(value) : '';
    console.log(`  ${chalk.hex('#FBBF24')('◈')}  ${icon}  ${lbl} ${val}`);
}

function stepDone(icon, label, value) {
    const lbl = chalk.greenBright(label.padEnd(22));
    const val = value ? chalk.whiteBright(value) : chalk.greenBright('Done');
    console.log(`  ${chalk.greenBright('✔')}  ${icon}  ${lbl} ${val}`);
}

function stepLoading(icon, label) {
    const lbl = chalk.hex('#C4B5FD')(label.padEnd(22));
    console.log(`  ${chalk.hex('#FBBF24')('◈')}  ${icon}  ${lbl} ${chalk.hex('#6B7280')('...')}`);
}

async function displayBanner() {
    console.clear();
    const gradient = (await import('gradient-string')).default;

    const banner = figlet.textSync('ILOM  BOT', {
        font: 'ANSI Shadow',
        horizontalLayout: 'fitted'
    });

    console.log(gradient.cristal(banner));
    console.log();
    console.log(line);
    console.log(gradient.rainbow('  ✦  Amazing WhatsApp Bot  ✦  v' + (constants.BOT_VERSION || '1.0.0') + '  ✦  By Ilom  ✦  Powered by Raphael  ✦'));
    console.log(chalk.hex('#7C3AED')('  Baileys  ·  AI  ·  MongoDB  ·  NodeCache'));
    console.log(line);
    console.log();
}

async function displayConfig() {
    console.log(chalk.hex('#8B5CF6').bold('  ⚙  CONFIGURATION'));
    console.log(tline);
    step('🤖', 'Bot Name',    config.botName);
    step('📌', 'Prefix',      config.prefix);
    step('🌐', 'Mode',        config.publicMode ? chalk.greenBright('Public') : chalk.yellowBright('Private'));
    step('👑', 'Owners',      config.ownerNumbers.length + ' configured');
    step('🔑', 'Session',     getSessionIdentifier() ? chalk.greenBright('Present') : chalk.yellowBright('QR Required'));
    step('🗄️', 'Database',    config.database?.enabled ? chalk.greenBright('Enabled') : chalk.gray('Disabled'));
    step('📡', 'Redis',       config.redis?.enabled ? chalk.greenBright('Enabled') : chalk.gray('Disabled'));
    step('🌍', 'Node',        process.version);
    console.log();
}

function displayDesignLogCard() {
    const sessionPreview = (
        process.env.SESSION_ID ||
        process.env.WA_SESSION_ID ||
        process.env.ILOMBOT_SESSION_ID ||
        process.env.CREDS_JSON ||
        process.env.SESSION_CREDS_JSON ||
        ''
    ) ? chalk.greenBright('READY') : chalk.yellowBright('QR MODE');

    const deployPort = process.env.PORT || config.server?.port || 5000;
    const modeBadge = config.publicMode ? chalk.greenBright('PUBLIC') : chalk.yellowBright('PRIVATE');

    box([
        chalk.hex('#C084FC').bold('  🎨  ILOM BOT STARTUP PANEL'),
        chalk.hex('#A78BFA')('  ───────────────────────────────────────────────'),
        `${chalk.hex('#60A5FA')('  ✦ Mode      :')} ${modeBadge}`,
        `${chalk.hex('#34D399')('  ✦ Session   :')} ${sessionPreview}`,
        `${chalk.hex('#FBBF24')('  ✦ Prefix    :')} ${chalk.whiteBright(config.prefix)}`,
        `${chalk.hex('#F472B6')('  ✦ Deploy    :')} ${chalk.whiteBright(`PORT ${deployPort}`)}`,
        `${chalk.hex('#22D3EE')('  ✦ Bot Name  :')} ${chalk.whiteBright(config.botName)}`
    ]);
    console.log();
}

async function displayReady(commandCount, pluginCount) {
    const gradient = (await import('gradient-string')).default;
    console.log();
    console.log(line);
    console.log(gradient.pastel('  ╔══════════════════════════════════════════════════════════════╗'));
    console.log(gradient.pastel('  ║                                                              ║'));
    console.log('  ' + chalk.hex('#8B5CF6')('║') + gradient.cristal('         ✦  ILOM BOT IS ONLINE AND READY  ✦            ') + chalk.hex('#8B5CF6')('║'));
    console.log(gradient.pastel('  ║                                                              ║'));
    console.log('  ' + chalk.hex('#8B5CF6')('║') + chalk.hex('#60A5FA')('  Commands: ') + chalk.whiteBright(String(commandCount).padEnd(6)) + chalk.hex('#60A5FA')('  Plugins: ') + chalk.whiteBright(String(pluginCount).padEnd(6)) + chalk.hex('#60A5FA')('  Prefix: ') + chalk.whiteBright(config.prefix.padEnd(14)) + chalk.hex('#8B5CF6')('║'));
    console.log('  ' + chalk.hex('#8B5CF6')('║') + chalk.hex('#34D399')('  📨 Listening for messages...') + ' '.repeat(33) + chalk.hex('#8B5CF6')('║'));
    console.log('  ' + chalk.hex('#8B5CF6')('║') + chalk.hex('#FBBF24')('  💬 Test with: ') + chalk.whiteBright(config.prefix + 'ping') + ' '.repeat(44) + chalk.hex('#8B5CF6')('║'));
    console.log(gradient.pastel('  ║                                                              ║'));
    console.log(gradient.pastel('  ╚══════════════════════════════════════════════════════════════╝'));
    console.log();
}

async function createDirectoryStructure() {
    const dirs = [
        'src/commands/admin', 'src/commands/ai', 'src/commands/downloader',
        'src/commands/economy', 'src/commands/fun', 'src/commands/games',
        'src/commands/general', 'src/commands/media', 'src/commands/owner',
        'src/commands/utility', 'src/handlers', 'src/models', 'src/plugins',
        'src/services', 'src/utils', 'temp/downloads', 'temp/uploads',
        'temp/stickers', 'temp/audio', 'temp/video', 'logs', 'session',
        'backups/database', 'backups/session', 'data/ai', 'data/economy'
    ];
    await Promise.all(dirs.map(d => fs.ensureDir(d)));
}

// ✅ Download creds.json from Mega using the FULL URL (file ID + #decryption key)
async function downloadFromMega(fullMegaUrl) {
    const { File } = await import('megajs');
    return new Promise((resolve, reject) => {
        let file;
        try {
            file = File.fromURL(fullMegaUrl);
        } catch (e) {
            return reject(new Error(`Mega URL parse failed: ${e.message}`));
        }

        file.loadAttributes((err) => {
            if (err) return reject(new Error(`Mega loadAttributes failed: ${err.message}`));

            const chunks = [];
            const stream = file.download();
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', e => reject(new Error(`Mega stream failed: ${e.message}`)));
        });
    });
}

async function processSessionCredentials() {
    await fs.ensureDir(SESSION_PATH);
    await fs.ensureDir(path.join(SESSION_PATH, 'keys'));
    const credPath = path.join(SESSION_PATH, 'creds.json');
    const keysPath = path.join(SESSION_PATH, 'keys');

    const sessionId = getSessionIdentifier();
    if (!sessionId) {
        logger.info('No SESSION_ID - will generate QR code');
        return false;
    }

    try {
        logger.info('Processing session credentials...');
        let sessionData;
        const persistSessionData = async (rawData) => {
            const credPath = path.join(SESSION_PATH, 'creds.json');
            const keysPath = path.join(SESSION_PATH, 'keys');

            let parsed = rawData;
            if (Buffer.isBuffer(parsed)) {
                const asText = parsed.toString('utf8').replace(/^\uFEFF/, '').trim();
                try {
                    parsed = JSON.parse(asText);
                } catch {
                    try {
                        parsed = JSON.parse(Buffer.from(asText, 'base64').toString('utf8'));
                    } catch {
                        // Some hosts prepend text around JSON; try extracting JSON object body
                        const firstBrace = asText.indexOf('{');
                        const lastBrace = asText.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace > firstBrace) {
                            const jsonSlice = asText.slice(firstBrace, lastBrace + 1);
                            try {
                                parsed = JSON.parse(jsonSlice);
                            } catch {
                                parsed = null;
                            }
                        } else {
                            parsed = null;
                        }
                    }
                }
            }

            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed);
                } catch {}
            }

            // If we got wrapped session data ({ creds, keys }) split it properly.
            if (parsed?.creds && typeof parsed.creds === 'object') {
                await fs.writeJSON(credPath, parsed.creds, { spaces: 2 });
                if (parsed.keys && typeof parsed.keys === 'object') {
                    for (const [keyName, keyData] of Object.entries(parsed.keys)) {
                        if (keyData && typeof keyData === 'object') {
                            await fs.writeJSON(path.join(keysPath, `${keyName}.json`), keyData, { spaces: 2 });
                        }
                    }
                }
                return true;
            }

            // If parsed is already creds.json shape, save directly.
            if (parsed?.noiseKey || parsed?.signedIdentityKey) {
                await fs.writeJSON(credPath, parsed, { spaces: 2 });
                return true;
            }

            // As last attempt, write raw buffer and re-parse as JSON file.
            if (Buffer.isBuffer(rawData)) {
                await fs.writeFile(credPath, rawData);
                try {
                    const saved = await fs.readJSON(credPath);
                    return !!(saved?.noiseKey || saved?.signedIdentityKey || saved?.creds);
                } catch {
                    const preview = rawData.toString('utf8').slice(0, 120).replace(/\s+/g, ' ');
                    logger.warn(`Session raw file is not JSON. Preview: ${preview}`);
                    return false;
                }
            }

            return false;
        };

        // ✅ PRIMARY: ilombot-- prefix
        // pair.js encodes the full Mega URL as base64 after the prefix:
        //   ilombot--<base64(https://mega.nz/file/FILEID#DECRYPTIONKEY)>
        // We decode it to get the full URL including the #key fragment,
        // then pass it directly to megajs which needs the hash to decrypt.
        if (
            sessionId.startsWith('ilombot--') ||
            sessionId.startsWith('ilombot ilombot--') ||
            /^https:\/\/mega\.nz\/(file|folder)\//.test(sessionId)
        ) {
            const encoded = sessionId
                .replace('ilombot ilombot--', '')
                .replace('ilombot--', '')
                .trim()
                .replace(/\s+/g, '');

            // ✅ Decode base64 to recover the full Mega URL with decryption key
            let fullMegaUrl;
            try {
                const normalized = encoded
                    .replace(/-/g, '+')
                    .replace(/_/g, '/')
                    .padEnd(Math.ceil(encoded.length / 4) * 4, '=');
                fullMegaUrl = Buffer.from(normalized, 'base64').toString('utf8').trim();
                // Validate it looks like a Mega URL
                if (!/^https:\/\/mega\.nz\/(file|folder)\//.test(fullMegaUrl)) {
                    throw new Error('Decoded value is not a Mega URL');
                }
                logger.info(`Decoded Mega URL: ${fullMegaUrl}`);
            } catch (decodeErr) {
                // ✅ FALLBACK for old-style sessions that stored raw file ID (not base64)
                // e.g. sessions generated before this fix
                logger.warn(`Base64 decode failed (${decodeErr.message}), treating as raw Mega file ID`);
                fullMegaUrl = null;
            }

            let fileData;

            // If sessionId is already a Mega URL, use it directly.
            if (/^https:\/\/mega\.nz\/(file|folder)\//.test(sessionId)) {
                fullMegaUrl = sessionId;
            }

            if (fullMegaUrl) {
                // ✅ New format: download directly from Mega with full URL
                logger.info('Downloading session from Mega...');
                try {
                    fileData = await downloadFromMega(fullMegaUrl);
                    logger.info('Downloaded session from Mega successfully');
                } catch (megaErr) {
                    logger.warn(`Mega download failed: ${megaErr.message} — trying fallback server...`);
                    // Fallback to koyeb server using just the file ID portion
                    const fileIdOnly = fullMegaUrl
                        .replace('https://mega.nz/file/', '')
                        .split('#')[0];
                    const axios = (await import('axios')).default;
                    const response = await axios.get(
                        `https://existing-madelle-lance-ui-efecfdce.koyeb.app/download/${fileIdOnly}`,
                        { responseType: 'arraybuffer', timeout: 30000 }
                    );
                    fileData = Buffer.from(response.data);
                    logger.info('Downloaded session from fallback server');
                }
            } else {
                // ✅ Old format fallback: encoded was a raw Mega file ID, use koyeb server
                logger.info('Using fallback download server for legacy session ID...');
                const axios = (await import('axios')).default;
                const response = await axios.get(
                    `https://existing-madelle-lance-ui-efecfdce.koyeb.app/download/${encoded}`,
                    { responseType: 'arraybuffer', timeout: 30000 }
                );
                fileData = Buffer.from(response.data);
                logger.info('Downloaded session from fallback server');
            }

            const persisted = await persistSessionData(fileData);
            if (!persisted) {
                await fs.remove(path.join(SESSION_PATH, 'creds.json')).catch(() => {});
                throw new Error('Downloaded session file is invalid or unsupported');
            }

            logger.info('✅ ilombot session loaded successfully');
            return true;
        }

        // ✅ LEGACY formats — kept exactly as-is, nothing removed

        if (sessionId.startsWith('Ilom~')) {
            sessionData = JSON.parse(Buffer.from(sessionId.replace('Ilom~', ''), 'base64').toString());
        } else if (sessionId.startsWith('{')) {
            sessionData = JSON.parse(sessionId);
        } else {
            try {
                sessionData = JSON.parse(Buffer.from(sessionId, 'base64').toString());
            } catch {
                sessionData = JSON.parse(sessionId);
            }
        }

        if (sessionData?.creds) {
            await fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData.creds, { spaces: 2 });
            if (sessionData.keys && typeof sessionData.keys === 'object') {
                const keysPath = path.join(SESSION_PATH, 'keys');
                for (const [keyName, keyData] of Object.entries(sessionData.keys)) {
                    if (keyData && typeof keyData === 'object') {
                        await fs.writeJSON(path.join(keysPath, `${keyName}.json`), keyData, { spaces: 2 });
                    }
                }
            }
        } else {
            await fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData, { spaces: 2 });
        }

        logger.info('Session credentials processed');
        return true;
    } catch (error) {
        logger.warn(`Session processing failed: ${error.message} - will use QR`);
        await fs.remove(path.join(SESSION_PATH, 'creds.json')).catch(() => {});
        return false;
    }
}

async function sendBotStatusUpdate(sock) {
    const now = new Date().toLocaleString('en-US', {
        timeZone: config.timezone || 'UTC',
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const text = `${config.botName} is Online\n\nStarted: ${now}\nMode: ${config.publicMode ? 'Public' : 'Private'}\nPrefix: ${config.prefix}\nCommands: ${commandHandler.getCommandCount()}\nPlugins: ${getActiveCount()}\n\nType ${config.prefix}help to see all commands`;

    for (const owner of config.ownerNumbers) {
        try {
            await sock.sendMessage(owner, { text });
        } catch {}
    }
}

async function setupEventHandlers(sock, saveCreds) {
    sock.ev.on('creds.update', async () => { await saveCreds(); });

    await messageHandler.initializeCommandHandler();

    sock.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages?.length) return;
        for (const message of messages) {
            try {
                if (!message?.key) continue;
                const from = message.key.remoteJid;
                if (!from || from === 'status@broadcast') continue;
                if (message.key.fromMe && !config.selfMode) continue;
                if (!message.message || !Object.keys(message.message).length) continue;

                const ignoredTypes = ['protocolMessage', 'senderKeyDistributionMessage', 'messageContextInfo'];
                const hasContent = Object.keys(message.message).some(k => !ignoredTypes.includes(k));
                if (!hasContent) continue;

                await messageHandler.handleIncomingMessage(sock, message);
            } catch (error) {
                logger.error('Error processing message:', error);
            }
        }
    });

    sock.ev.on('messages.update', async (updates) => {
        if (config.events?.messageUpdate) {
            await messageHandler.handleMessageUpdate(sock, updates);
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        try {
            await groupHandler.handleParticipantsUpdate(sock, update);
        } catch (error) {
            logger.error('Group participants update error:', error);
        }
    });

    sock.ev.on('groups.update', async (updates) => {
        try {
            await groupHandler.handleGroupUpdate(sock, updates);
        } catch (error) {
            logger.error('Groups update error:', error);
        }
    });

    sock.ev.on('call', async (calls) => {
        await callHandler.handleIncomingCall(sock, calls);
    });

    setInterval(() => {
        if (sock?.user && !isShuttingDown) {
            sock.sendPresenceUpdate('available').catch(() => {});
        }
    }, 60000);

    logger.info('All event handlers registered');
}

async function promptPairingNumber() {
    if (cachedPairingNumber) return cachedPairingNumber;
    if (getSessionIdentifier()) return null;
    if (!process.stdin.isTTY || process.env.NO_CONSOLE_INPUT === 'true') {
        logger.warn('Pairing required but console input is not available.');
        return null;
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        console.log(chalk.hex('#60A5FA')('\n  📱 Pairing Mode Enabled'));
        console.log(chalk.hex('#C4B5FD')('  Enter your WhatsApp number with country code (example: 2349031575131)\n'));
        const answer = await rl.question('  Number: ');
        const normalized = String(answer || '').replace(/\D/g, '');
        if (normalized.length < 10) return null;
        cachedPairingNumber = normalized;
        return normalized;
    } finally {
        rl.close();
    }
}

async function requestPairingCodeIfNeeded(sock, isRegistered) {
    if (isRegistered) return;
    const number = await promptPairingNumber();
    if (!number) {
        logger.warn('Session is not registered and no phone number was provided.');
        return;
    }

    for (let i = 1; i <= 5; i++) {
        try {
            const rawCode = await sock.requestPairingCode(number);
            const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
            console.log(chalk.greenBright('\n  ✅ Pairing code generated successfully\n'));
            console.log(chalk.hex('#FBBF24')(`  🔑 Pairing Code: ${code}\n`));
            console.log(chalk.hex('#C4B5FD')('  Guide: WhatsApp > Linked Devices > Link with phone number > Enter code above.\n'));
            return;
        } catch (error) {
            logger.warn(`Pairing code attempt ${i}/5 failed: ${error.message}`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    logger.error('Unable to generate pairing code after multiple attempts. Please restart and try again.');
}

async function establishWhatsAppConnection() {
    return new Promise(async (resolve, reject) => {
        try {
            const { makeWASocket, Browsers, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = await import('@whiskeysockets/baileys');

            const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
            const { version } = await fetchLatestBaileysVersion();
            let pairingRequested = false;

            logger.info(`Connecting with Baileys v${version.join('.')}`);

            sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' }).child({ level: 'fatal' }))
                },
                printQRInTerminal: false,
                browser: Browsers.ubuntu('Chrome'),
                markOnlineOnConnect: config.autoOnline !== false,
                syncFullHistory: false,
                defaultQueryTimeoutMs: undefined,
                connectTimeoutMs: 120000,
                keepAliveIntervalMs: 25000,
                retryRequestDelayMs: 250,
                generateHighQualityLinkPreview: false,
                logger: P({ level: 'silent' }),
                version,
                getMessage: async () => ({ conversation: '' })
            });

            if (connectionTimeout) clearTimeout(connectionTimeout);
            connectionTimeout = setTimeout(() => {
                if (!sock?.user) {
                    logger.warn('Connection timeout - retrying');
                    handleReconnect(resolve, reject);
                }
            }, 120000);

            sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
                if (connection === 'connecting' && !state.creds?.registered && !pairingRequested && !getSessionIdentifier()) {
                    pairingRequested = true;
                    setTimeout(() => {
                        requestPairingCodeIfNeeded(sock, false).catch((e) => {
                            logger.warn(`Pairing request failed: ${e.message}`);
                        });
                    }, 2000);
                }

                if (qr) {
                    if (!pairingRequested) {
                        try {
                            const qrterm = await import('qrcode-terminal');
                            qrterm.default.generate(qr, { small: true });
                        } catch {}
                        console.log(chalk.hex('#FBBF24').bold('\n  📱  Scan the QR code above with WhatsApp\n'));
                        if (qrService.isQREnabled()) {
                            await qrService.generateQR(qr).catch(() => {});
                        }
                    } else {
                        logger.info('QR generated but waiting for pairing-code link flow.');
                    }
                }

                if (connection === 'open') {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                    reconnectAttempts = 0;

                    stepDone('📡', 'WhatsApp', chalk.greenBright('Connected!'));
                    console.log();

                    if (qrService.isQREnabled()) await qrService.clearQR().catch(() => {});

                    await setupEventHandlers(sock, saveCreds);
                    global.sock = sock;
                    await sendBotStatusUpdate(sock).catch(() => {});
                    resolve(sock);
                }

                if (connection === 'close') {
                    if (connectionTimeout) { clearTimeout(connectionTimeout); connectionTimeout = null; }
                    if (isShuttingDown) return resolve(null);

                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    logger.warn(`Connection closed. Code: ${statusCode}`);

                    const requiresFreshPairing = [
                        DisconnectReason.badSession,
                        DisconnectReason.loggedOut
                    ].includes(statusCode);

                    if (requiresFreshPairing) {
                        logger.warn('Session became invalid. Clearing local auth files and waiting for new pairing...');
                        await fs.remove(SESSION_PATH).catch(() => {});
                        await fs.ensureDir(SESSION_PATH);
                        await fs.ensureDir(path.join(SESSION_PATH, 'keys'));
                        cachedPairingNumber = null;
                        reconnectAttempts = 0;
                    }

                    console.log(chalk.yellowBright(`\n  ⚠  Disconnected (${statusCode}) — reconnecting...\n`));
                    handleReconnect(resolve, reject);
                }
            });

            sock.ev.on('creds.update', async () => { await saveCreds(); });

        } catch (error) {
            logger.error('Connection setup failed:', error);
            handleReconnect(resolve, reject);
        }
    });
}

function handleReconnect(resolve, reject) {
    if (isShuttingDown) return resolve(null);
    if (reconnectAttempts >= MAX_RECONNECT) {
        return reject(new Error(`Max reconnection attempts (${MAX_RECONNECT}) reached`));
    }
    const delay = RECONNECT_DELAYS[reconnectAttempts] || 30000;
    reconnectAttempts++;
    console.log(chalk.hex('#FBBF24')(`\n  ↺  Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT})\n`));
    setTimeout(() => establishWhatsAppConnection().then(resolve).catch(reject), delay);
}

function setupProcessHandlers() {
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception:', error);
        setTimeout(() => process.exit(1), 2000);
    });

    const gracefulShutdown = async (signal) => {
        console.log(chalk.redBright(`\n  ⏹  ${signal} — shutting down gracefully\n`));
        isShuttingDown = true;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (sock) {
            try { await sock.logout(); } catch {}
        }
        process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

async function loadSavedSettings() {
    try {
        const mongoose = await import('mongoose');
        if (mongoose.default.connection.readyState !== 1) return;
        const prefixSetting = await Settings.findOne({ key: 'prefix' }).catch(() => null);
        if (prefixSetting?.value) {
            config.prefix = prefixSetting.value;
            logger.info(`Loaded saved prefix: ${config.prefix}`);
        }
    } catch {}
}

async function initializeBot() {
    try {
        await displayBanner();
        await displayConfig();
        displayDesignLogCard();

        console.log(chalk.hex('#8B5CF6').bold('  ⚡  INITIALIZING SYSTEMS'));
        console.log(tline);

        stepLoading('📁', 'Directories');
        await createDirectoryStructure();
        stepDone('📁', 'Directories');

        stepLoading('🗄️', 'Database');
        await connectToDatabase();
        stepDone('🗄️', 'Database');

        stepLoading('💾', 'Settings');
        await loadSavedSettings();
        stepDone('💾', 'Settings', `Prefix: ${config.prefix}`);

        stepLoading('🔑', 'Session');
        const hasSession = await processSessionCredentials();
        hasSession ? stepDone('🔑', 'Session', 'Loaded') : stepDone('🔑', 'Session', chalk.yellowBright('QR Mode'));

        stepLoading('⚡', 'Cache');
        await initializeCache();
        stepDone('⚡', 'Cache');

        stepLoading('📦', 'Commands');
        await commandHandler.initialize();
        await commandHandler.loadCommands();
        stepDone('📦', 'Commands', `${commandHandler.getCommandCount()} loaded`);

        stepLoading('🔌', 'Plugins');
        await loadPlugins();
        stepDone('🔌', 'Plugins', `${getActiveCount()} active`);

        stepLoading('🕐', 'Scheduler');
        await startScheduler();
        stepDone('🕐', 'Scheduler');

        stepLoading('🌐', 'Web Server');
        await startWebServer(app);
        stepDone('🌐', 'Web Server', `Port ${config.server?.port || process.env.PORT || 5000}`);

        console.log();
        console.log(tline);
        stepLoading('📡', 'WhatsApp');
        console.log();

        await establishWhatsAppConnection();

        setupProcessHandlers();

        await displayReady(commandHandler.getCommandCount(), getActiveCount());

    } catch (error) {
        console.log(chalk.redBright('\n  ✘  Initialization failed: ' + error.message));
        logger.error('Initialization failed:', error);
        process.exit(1);
    }
}

initializeBot().then(() => new Promise(() => {})).catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
