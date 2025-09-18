require('dotenv').config();
const {
    default: makeWASocket,
    Browsers,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const NodeCache = require('node-cache');
const gradient = require('gradient-string');
const figlet = require('figlet');
const chalk = require('chalk');

const { connectToDatabase } = require('./src/utils/database');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const commandHandler = require('./src/handlers/commandHandler');
const eventHandler = require('./src/handlers/eventHandler');
const callHandler = require('./src/handlers/callHandler');
const groupHandler = require('./src/handlers/groupHandler');
const mediaHandler = require('./src/handlers/mediaHandler');
const errorHandler = require('./src/handlers/errorHandler');
const config = require('./src/config');
const constants = require('./src/constants');
const { initializeCommands } = require('./src/utils/commandManager');
const { loadPlugins, getActiveCount } = require('./src/utils/pluginManager');
const { startScheduler } = require('./src/utils/scheduler');
const { initializeCache } = require('./src/utils/cache');
const { startWebServer } = require('./src/utils/webServer');

const msgRetryCounterCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });
const app = express();
let sock = null;
let isInitialized = false;
let reconnectAttempts = 0;

const SESSION_PATH = path.join(process.cwd(), 'session');
const MAX_RECONNECT = 3;

async function createDirectoryStructure() {
    const directories = [
        'src/commands/admin', 'src/commands/ai', 'src/commands/downloader',
        'src/commands/economy', 'src/commands/fun', 'src/commands/games',
        'src/commands/general', 'src/commands/media', 'src/commands/owner',
        'src/commands/utility', 'src/handlers', 'src/models', 'src/plugins',
        'src/services', 'src/middleware', 'src/utils', 'src/api/routes',
        'src/events', 'src/locales', 'src/assets/images', 'src/assets/audio',
        'src/assets/fonts', 'src/assets/templates', 'src/database/migrations',
        'src/database/seeds', 'temp/downloads', 'temp/uploads', 'temp/stickers',
        'temp/audio', 'temp/video', 'temp/documents', 'logs', 'session',
        'backups/database', 'backups/session', 'backups/media',
        'media/profile', 'media/stickers', 'media/downloads', 'media/cache'
    ];
    
    await Promise.all(directories.map(dir => fs.ensureDir(dir)));
}

function displayStartupBanner() {
    console.clear();
    
    const banner = figlet.textSync('ILOM BOT', {
        font: 'ANSI Shadow',
        horizontalLayout: 'fitted',
        verticalLayout: 'default'
    });
    
    console.log(gradient.rainbow(banner));
    console.log(chalk.cyan.bold('\n🧠 Amazing Bot 🧠 v1 created by Ilom\n'));
    console.log(chalk.yellow('═'.repeat(65)));
    console.log(chalk.green('🚀 Initializing Ilom WhatsApp Bot System...'));
    console.log(chalk.yellow('═'.repeat(65)));
}

async function processSessionCredentials() {
    await fs.ensureDir(SESSION_PATH);
    await fs.ensureDir(path.join(SESSION_PATH, 'keys'));
    
    if (process.env.SESSION_ID && process.env.SESSION_ID.trim() !== '') {
        try {
            const sessionId = process.env.SESSION_ID.trim();
            let sessionData;
            
            logger.info('🔐 Processing session credentials from environment...');
            
            // Handle different session ID formats with improved error handling
            if (sessionId.startsWith('Ilom~')) {
                const cleanId = sessionId.replace('Ilom~', '');
                sessionData = JSON.parse(Buffer.from(cleanId, 'base64').toString());
                logger.info('✅ Processed Ilom format session');
            } else if (sessionId.startsWith('{') && sessionId.endsWith('}')) {
                sessionData = JSON.parse(sessionId);
                logger.info('✅ Processed JSON format session');
            } else {
                try {
                    sessionData = JSON.parse(Buffer.from(sessionId, 'base64').toString());
                    logger.info('✅ Processed base64 format session');
                } catch {
                    sessionData = JSON.parse(sessionId);
                    logger.info('✅ Processed direct JSON format session');
                }
            }
            
            if (sessionData && typeof sessionData === 'object') {
                // Handle complete multi-file auth state structure
                if (sessionData.creds) {
                    // New format: contains both creds and keys
                    await fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData.creds, { spaces: 2 });
                    
                    // Process keys if available
                    if (sessionData.keys && typeof sessionData.keys === 'object') {
                        const keysPath = path.join(SESSION_PATH, 'keys');
                        await fs.ensureDir(keysPath);
                        
                        for (const [keyName, keyData] of Object.entries(sessionData.keys)) {
                            if (keyData && typeof keyData === 'object') {
                                await fs.writeJSON(path.join(keysPath, `${keyName}.json`), keyData, { spaces: 2 });
                            }
                        }
                        logger.info('✅ Session credentials and keys processed');
                    } else {
                        logger.info('✅ Session credentials processed (keys will be generated)');
                    }
                } else {
                    // Legacy format: direct creds object
                    await fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData, { spaces: 2 });
                    logger.info('✅ Session credentials processed (legacy format)');
                }
                return true;
            }
        } catch (error) {
            logger.warn('⚠️ Invalid SESSION_ID format:', error.message);
            logger.debug('SESSION_ID content preview:', process.env.SESSION_ID?.substring(0, 100) + '...');
        }
    }
    
    // Check for existing valid session
    const credsPath = path.join(SESSION_PATH, 'creds.json');
    const keysPath = path.join(SESSION_PATH, 'keys');
    
    if (await fs.pathExists(credsPath)) {
        try {
            const creds = await fs.readJSON(credsPath);
            if (creds && (creds.noiseKey || creds.signedIdentityKey)) {
                logger.info('📁 Using existing session credentials');
                return true;
            } else {
                logger.warn('🔄 Invalid creds.json found, will regenerate');
                await fs.remove(credsPath);
            }
        } catch (error) {
            logger.warn('🔄 Corrupted creds.json found, will regenerate');
            await fs.remove(credsPath).catch(() => {});
        }
    }
    
    logger.info('ℹ️ No valid session found - will generate QR code for pairing');
    return false;
}

async function sendBotStatusUpdate(sock) {
    const startupTime = new Date().toLocaleString('en-US', {
        timeZone: config.timezone || 'UTC',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const statusMessage = `╭─────「 *${config.botName}* 」─────╮
│ ✅ Status: Online & Active
│ 🔥 Version: ${constants.BOT_VERSION}
│ 🕐 Started: ${startupTime}
│ 🌐 Mode: ${config.publicMode ? 'Public' : 'Private'}
│ 👨‍💻 Developer: Ilom
│ 🎯 Prefix: ${config.prefix}
│ 📝 Commands: ${await commandHandler.getCommandCount()}
│ 🔌 Plugins: ${getActiveCount()}
╰─────────────────────────╯

🚀 *${config.botName} is now operational!*
📖 Type *${config.prefix}help* to view all commands
🆘 Type *${config.prefix}menu* for quick navigation`;

    for (const ownerNumber of config.ownerNumbers) {
        try {
            await sock.sendMessage(ownerNumber, {
                text: statusMessage,
                contextInfo: {
                    externalAdReply: {
                        title: config.botName,
                        body: 'Bot Successfully Started!',
                        thumbnailUrl: config.botThumbnail,
                        sourceUrl: config.botRepository,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        } catch (error) {
            logger.error(`Failed to send status to ${ownerNumber}:`, error);
        }
    }
}

async function handleConnectionEvents(sock, connectionUpdate) {
    const { connection, lastDisconnect, qr, receivedPendingNotifications } = connectionUpdate;
    
    if (qr && !process.env.SESSION_ID) {
        console.log(chalk.cyan('\n📱 QR Code received - scan with WhatsApp to connect'));
        console.log(chalk.yellow('Set SESSION_ID environment variable to avoid QR scanning in future'));
    }
    
    if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.forbidden;
        
        if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.forbidden) {
            console.log(chalk.red('❌ Session invalid - please provide valid SESSION_ID'));
            logger.warn('Session credentials invalid, clearing session for fresh start...');
            
            // Enhanced cloud deployment handling - clear session safely
            try {
                await fs.remove(SESSION_PATH);
                logger.info('🔄 Session cleared, ready for new authentication');
                
                // Enhanced cloud deployment detection and handling
                const cloudProviders = {
                    'RAILWAY_PROJECT_ID': 'Railway',
                    'REPL_ID': 'Replit', 
                    'HEROKU_APP_NAME': 'Heroku',
                    'RENDER': 'Render',
                    'VERCEL': 'Vercel',
                    'NETLIFY': 'Netlify',
                    'KOYEB_APP': 'Koyeb'
                };
                
                const detectedProvider = Object.entries(cloudProviders).find(([key]) => process.env[key]);
                
                if (detectedProvider) {
                    logger.info(`🔄 ${detectedProvider[1]} deployment detected, keeping web server active...`);
                    logger.info('💡 To connect WhatsApp, set SESSION_ID in environment/secrets and restart');
                    logger.info('📱 The bot will show QR code for initial setup if no valid session exists');
                    return;
                }
            } catch (error) {
                logger.error('Error clearing session:', error);
            }
            return;
        }
        
        if (shouldReconnect && reconnectAttempts < MAX_RECONNECT) {
            reconnectAttempts++;
            logger.info(`🔄 Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT})`);
            setTimeout(establishWhatsAppConnection, 5000);
        } else if (reconnectAttempts >= MAX_RECONNECT) {
            logger.error('❌ Max reconnection attempts reached');
            reconnectAttempts = 0;
            setTimeout(establishWhatsAppConnection, 30000);
        }
    } else if (connection === 'open') {
        reconnectAttempts = 0;
        logger.info('✅ WhatsApp connection established');
        console.log(chalk.green.bold('🚀 Bot is online and ready!'));
        
        if (!isInitialized) {
            isInitialized = true;
            if (config.ownerNumbers && config.ownerNumbers.length > 0) {
                await sendBotStatusUpdate(sock);
            }
        }
    } else if (connection === 'connecting') {
        logger.info('🔗 Connecting to WhatsApp...');
    }
}

async function establishWhatsAppConnection() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
        const { version } = await fetchLatestBaileysVersion();
        
        sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
            },
            logger: P({ level: 'silent' }),
            browser: Browsers.macOS('Chrome'),
            msgRetryCounterCache,
            generateHighQualityLinkPreview: true,
            markOnlineOnConnect: config.markOnline,
            syncFullHistory: false,
            fireInitQueries: true,
            emitOwnEvents: false,
            maxMsgRetryCount: 3,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            retryRequestDelayMs: 1000,
            maxQueryResponseTime: 30000,
            alwaysUseTakeOver: false,
            getMessage: async (key) => {
                return {};
            }
        });
        
        sock.ev.on('connection.update', (update) => 
            handleConnectionEvents(sock, update)
        );
        
        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type === 'notify') {
                for (const message of messages) {
                    await messageHandler.handleIncomingMessage(sock, message);
                }
            }
        });
        
        sock.ev.on('messages.update', async (messageUpdates) => {
            await messageHandler.handleMessageUpdate(sock, messageUpdates);
        });
        
        sock.ev.on('messages.delete', async (deletedMessages) => {
            await messageHandler.handleMessageDelete(sock, deletedMessages);
        });
        
        sock.ev.on('group-participants.update', async (groupUpdate) => {
            try {
                await groupHandler.handleParticipantsUpdate(sock, groupUpdate);
            } catch (error) {
                logger.error('Group participants update error:', error);
            }
        });
        
        sock.ev.on('groups.update', async (groupsUpdate) => {
            try {
                await groupHandler.handleGroupUpdate(sock, groupsUpdate);
            } catch (error) {
                logger.error('Groups update error:', error);
            }
        });
        
        sock.ev.on('call', async (callEvents) => {
            await callHandler.handleIncomingCall(sock, callEvents);
        });
        
        sock.ev.on('contacts.update', async (contactUpdates) => {
            try {
                await eventHandler.handleContactUpdate(sock, contactUpdates);
            } catch (error) {
                logger.error('Contact update error:', error);
            }
        });
        
        global.sock = sock;
        
    } catch (error) {
        logger.error('Failed to establish WhatsApp connection:', error);
        if (reconnectAttempts < MAX_RECONNECT) {
            reconnectAttempts++;
            setTimeout(establishWhatsAppConnection, 5000);
        } else {
            process.exit(1);
        }
    }
}

function setupProcessHandlers() {
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Promise Rejection:', reason);
        errorHandler.handleError('unhandledRejection', reason);
    });
    
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        errorHandler.handleError('uncaughtException', error);
        process.exit(1);
    });
    
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT - Graceful shutdown initiated');
        if (sock) await sock.logout();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM - Graceful shutdown initiated');
        if (sock) await sock.logout();
        process.exit(0);
    });
}

async function loadLocalizationFiles() {
    const localeDir = path.join(__dirname, 'src', 'locales');
    const locales = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko'];
    
    for (const locale of locales) {
        const filePath = path.join(localeDir, `${locale}.json`);
        if (!await fs.pathExists(filePath)) {
            await fs.writeJSON(filePath, {
                welcome: `Welcome to ${config.botName}!`,
                help: 'Available commands',
                error: 'An error occurred'
            });
        }
    }
}

async function createDefaultAssets() {
    const assetsDir = path.join(__dirname, 'src', 'assets');
    
    const defaultFiles = {
        'images/logo.png': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'templates/welcome.html': '<!DOCTYPE html><html><body><h1>Welcome!</h1></body></html>',
        'templates/stats.html': '<!DOCTYPE html><html><body><h1>Bot Stats</h1></body></html>'
    };
    
    for (const [file, content] of Object.entries(defaultFiles)) {
        const filePath = path.join(assetsDir, file);
        if (!await fs.pathExists(filePath)) {
            await fs.ensureDir(path.dirname(filePath));
            if (file.endsWith('.png')) {
                await fs.writeFile(filePath, Buffer.from(content, 'base64'));
            } else {
                await fs.writeFile(filePath, content);
            }
        }
    }
}

async function initializeDatabaseModels() {
    const modelsDir = path.join(__dirname, 'src', 'models');
    const models = [
        'User.js', 'Group.js', 'Message.js', 'Command.js', 'Economy.js',
        'Game.js', 'Warning.js', 'Ban.js', 'Premium.js', 'Settings.js',
        'Log.js', 'Session.js'
    ];
    
    for (const model of models) {
        const modelPath = path.join(modelsDir, model);
        if (!await fs.pathExists(modelPath)) {
            await fs.writeFile(modelPath, `const mongoose = require('mongoose');\n\nmodule.exports = mongoose.model('${model.replace('.js', '')}', new mongoose.Schema({}));`);
        }
    }
}

async function setupAPIRoutes() {
    const routesDir = path.join(__dirname, 'src', 'api', 'routes');
    const routes = [
        'auth.js', 'users.js', 'groups.js', 'messages.js', 
        'commands.js', 'stats.js', 'settings.js', 'webhooks.js', 'health.js'
    ];
    
    for (const route of routes) {
        const routePath = path.join(routesDir, route);
        if (!await fs.pathExists(routePath)) {
            const routeName = route.replace('.js', '');
            await fs.writeFile(routePath, `const express = require('express');\nconst router = express.Router();\n\nrouter.get('/', (req, res) => {\n    res.json({ route: '${routeName}', status: 'active' });\n});\n\nmodule.exports = router;`);
        }
    }
}

async function createConfigurationFiles() {
    const configFiles = {
        '.env.example': `SESSION_ID=\nOWNER_NUMBERS=254700143167\nPREFIX=.\nPUBLIC_MODE=false\nDATABASE_URL=mongodb://localhost:27017/ilombot\nPORT=3000\nTIMEZONE=UTC\nBOT_NAME=Ilom Bot\nBOT_VERSION=1.0.0`,
        '.gitignore': `node_modules/\n.env\nsession/\nlogs/\ntemp/\nbackups/\nmedia/cache/\n*.log\n.DS_Store`,
        '.dockerignore': `node_modules/\n.env\nsession/\nlogs/\ntemp/\nbackups/\n*.log\nDockerfile\n.dockerignore\n.git/`,
        'package.json': JSON.stringify({
            name: 'ilom-whatsapp-bot',
            version: '1.0.0',
            description: 'Advanced WhatsApp Bot by Ilom',
            main: 'index.js',
            scripts: {
                start: 'node index.js',
                dev: 'nodemon index.js',
                test: 'jest'
            },
            dependencies: {
                '@whiskeysockets/baileys': '^6.6.0',
                'express': '^4.18.2',
                'fs-extra': '^11.1.1',
                'pino': '^8.15.0',
                'node-cache': '^5.1.2',
                'gradient-string': '^2.0.2',
                'figlet': '^1.6.0',
                'chalk': '^4.1.2',
                'dotenv': '^16.3.1',
                'mongoose': '^7.5.0',
                'axios': '^1.5.0',
                'moment': '^2.29.4'
            },
            devDependencies: {
                'nodemon': '^3.0.1',
                'jest': '^29.6.2'
            }
        }, null, 2)
    };
    
    for (const [file, content] of Object.entries(configFiles)) {
        const filePath = path.join(process.cwd(), file);
        if (!await fs.pathExists(filePath)) {
            await fs.writeFile(filePath, content);
        }
    }
}

async function initializeBot() {
    try {
        displayStartupBanner();
        
        logger.info('Creating project directory structure...');
        await createDirectoryStructure();
        
        logger.info('Setting up configuration files...');
        await createConfigurationFiles();
        
        logger.info('Loading localization files...');
        await loadLocalizationFiles();
        
        logger.info('Creating default assets...');
        await createDefaultAssets();
        
        logger.info('Initializing database models...');
        await initializeDatabaseModels();
        
        logger.info('Setting up API routes...');
        await setupAPIRoutes();
        
        logger.info('Connecting to database...');
        await connectToDatabase();
        
        logger.info('Processing session credentials...');
        await processSessionCredentials();
        
        logger.info('Initializing cache system...');
        await initializeCache();
        
        logger.info('Loading command modules...');
        await initializeCommands();
        
        logger.info('Loading plugin system...');
        await loadPlugins();
        
        logger.info('Starting task scheduler...');
        await startScheduler();
        
        logger.info('Starting web server...');
        await startWebServer(app);
        
        logger.info('Establishing WhatsApp connection...');
        await establishWhatsAppConnection();
        
        setupProcessHandlers();
        
        logger.info('Bot initialization completed successfully');
        console.log(chalk.magenta.bold('🎉 Ilom Bot is fully operational and ready to serve!'));
        
    } catch (error) {
        logger.error('Bot initialization failed:', error);
        console.log(chalk.red.bold('❌ Initialization failed - Check logs for details'));
        process.exit(1);
    }
}

initializeBot();