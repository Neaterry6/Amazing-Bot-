import 'dotenv/config';
import P from 'pino';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import NodeCache from 'node-cache';
import figlet from 'figlet';
import chalk from 'chalk';
import qrcode from 'qrcode-terminal';
import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { connectToDatabase } from './src/utils/database.js';
import logger from './src/utils/logger.js';
import messageHandler from './src/handlers/messageHandler.js';
import { commandHandler } from './src/handlers/commandHandler.js';
import eventHandler from './src/handlers/eventHandler.js';
import callHandler from './src/handlers/callHandler.js';
import groupHandler from './src/handlers/groupHandler.js';
import mediaHandler from './src/handlers/mediaHandler.js';
import errorHandler from './src/handlers/errorHandler.js';
import config from './src/config.js';
import constants from './src/constants.js';
import { loadPlugins, getActiveCount } from './src/utils/pluginManager.js';
import { startScheduler } from './src/utils/scheduler.js';
import { initializeCache } from './src/utils/cache.js';
import { startWebServer } from './src/utils/webServer.js';
import qrService from './src/services/qrService.js';

const msgRetryCounterCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });
const app = express();
let sock = null;
let isInitialized = false;
let reconnectAttempts = 0;

const SESSION_PATH = process.env.NODE_ENV === 'production' ? '/opt/render/project/src/auth' : path.join(process.cwd(), 'cache', 'auth_info_baileys');
const MAX_RECONNECT = 3;

async function withTimeout(promise, ms, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
  ]);
}

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
  
  await Promise.all(directories.map(dir => withTimeout(
    fs.ensureDir(path.join(process.cwd(), dir)),
    5000,
    `Failed to create directory: ${dir}`
  )));
}

async function displayStartupBanner() {
  console.clear();
  const banner = figlet.textSync('ILOM BOT', { font: 'ANSI Shadow', horizontalLayout: 'fitted', verticalLayout: 'default' });
  const gradient = (await import('gradient-string')).default;
  console.log(gradient.rainbow(banner));
  console.log(chalk.cyan.bold('\n🧠 Amazing Bot 🧠 v1 created by Ilom\n'));
  console.log(chalk.yellow('═'.repeat(65)));
  console.log(chalk.green('🚀 Initializing Ilom WhatsApp Bot System...'));
  console.log(chalk.yellow('═'.repeat(65)));
}

async function processSessionCredentials() {
  await withTimeout(fs.ensureDir(SESSION_PATH), 5000, 'Failed to create session directory');
  await withTimeout(fs.ensureDir(path.join(SESSION_PATH, 'keys')), 5000, 'Failed to create keys directory');
  
  if (process.env.SESSION_ID && process.env.SESSION_ID.trim() !== '') {
    try {
      const sessionId = process.env.SESSION_ID.trim();
      let sessionData;
      logger.info('🔐 Processing session credentials from environment...');

      // Handle session ID formats
      try {
        if (sessionId.startsWith('Ilom~')) {
          sessionData = JSON.parse(Buffer.from(sessionId.replace('Ilom~', ''), 'base64').toString());
          logger.info('✅ Processed Ilom format session');
        } else if (sessionId.startsWith('{') && sessionId.endsWith('}')) {
          sessionData = JSON.parse(sessionId);
          logger.info('✅ Processed JSON format session');
        } else {
          sessionData = JSON.parse(Buffer.from(sessionId, 'base64').toString());
          logger.info('✅ Processed base64 format session');
        }
      } catch (error) {
        logger.warn('⚠️ Invalid SESSION_ID format:', error.message);
        return false;
      }

      if (sessionData && typeof sessionData === 'object') {
        if (sessionData.creds) {
          await withTimeout(
            fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData.creds, { spaces: 2 }),
            5000,
            'Failed to write creds.json'
          );
          if (sessionData.keys && typeof sessionData.keys === 'object') {
            const keysPath = path.join(SESSION_PATH, 'keys');
            for (const [keyName, keyData] of Object.entries(sessionData.keys)) {
              if (keyData && typeof keyData === 'object') {
                await withTimeout(
                  fs.writeJSON(path.join(keysPath, `${keyName}.json`), keyData, { spaces: 2 }),
                  5000,
                  `Failed to write key: ${keyName}`
                );
              }
            }
            logger.info('✅ Session credentials and keys processed');
          } else {
            logger.info('✅ Session credentials processed (keys will be generated)');
          }
        } else {
          await withTimeout(
            fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData, { spaces: 2 }),
            5000,
            'Failed to write legacy creds.json'
          );
          logger.info('✅ Session credentials processed (legacy format)');
        }
        return true;
      }
    } catch (error) {
      logger.warn('⚠️ Failed to process SESSION_ID:', error.message);
    }
  }

  const credsPath = path.join(SESSION_PATH, 'creds.json');
  if (await fs.pathExists(credsPath)) {
    try {
      const creds = await withTimeout(fs.readJSON(credsPath), 5000, 'Failed to read creds.json');
      if (creds && (creds.noiseKey || creds.signedIdentityKey)) {
        logger.info('📁 Using existing session credentials');
        return true;
      } else {
        logger.warn('🔄 Invalid creds.json found, will regenerate');
        await withTimeout(fs.remove(credsPath), 5000, 'Failed to remove invalid creds.json');
      }
    } catch (error) {
      logger.warn('🔄 Corrupted creds.json found, will regenerate');
      await withTimeout(fs.remove(credsPath), 5000, 'Failed to remove corrupted creds.json');
    }
  }

  logger.info('ℹ️ No valid session found - will generate QR code for pairing');
  return false;
}

async function sendBotStatusUpdate(sock) {
  const startupTime = new Date().toLocaleString('en-US', {
    timeZone: config.timezone || 'Africa/Nairobi',
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

  for (const ownerNumber of config.ownerNumbers || []) {
    try {
      const jid = `${ownerNumber}@s.whatsapp.net`;
      await sock.sendMessage(jid, {
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
  const { connection, lastDisconnect, qr } = connectionUpdate;

  if (qr && !process.env.SESSION_ID) {
    console.log(chalk.cyan('\n📱 QR Code received - scan with WhatsApp to connect'));
    console.log(chalk.yellow('Set SESSION_ID environment variable to avoid QR scanning in future'));
    if (process.env.NODE_ENV !== 'production') {
      qrcode.generate(qr, { small: true });
    }

    if (qrService.isQREnabled()) {
      try {
        const qrGenerated = await withTimeout(
          qrService.generateQR(qr),
          10000,
          'Failed to generate QR code'
        );
        if (qrGenerated) {
          console.log(chalk.green('✅ QR code generated and saved'));
          console.log(chalk.blue(`🌐 Access QR code at: http://localhost:${config.server.port}/qr`));
        } else {
          console.log(chalk.red('❌ Failed to generate QR code'));
        }
      } catch (error) {
        logger.error('Error generating QR code:', error);
      }
    }
  }

  if (connection === 'close') {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
    if (statusCode === DisconnectReason.restartRequired) {
      logger.info('🔄 Restart required, reconnecting...');
      setTimeout(establishWhatsAppConnection, 10000);
    } else if (statusCode !== DisconnectReason.loggedOut && reconnectAttempts < MAX_RECONNECT) {
      logger.info(`🔄 Reconnecting (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT})...`);
      reconnectAttempts++;
      setTimeout(establishWhatsAppConnection, 5000);
    } else {
      logger.error('Connection closed permanently or max reconnect attempts reached');
      if (statusCode === DisconnectReason.loggedOut) {
        logger.warn('🔄 Logged out, clearing auth and requiring new QR scan');
        fs.remove(SESSION_PATH).catch(() => {});
      }
      process.exit(1);
    }
  } else if (connection === 'open') {
    reconnectAttempts = 0;
    logger.info('✅ WhatsApp connection established');
    console.log(chalk.green.bold('🚀 Bot is online and ready!'));

    if (qrService.isQREnabled()) {
      await withTimeout(qrService.clearQR(), 5000, 'Failed to clear QR code');
    }

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
    const { version } = await withTimeout(fetchLatestBaileysVersion(), 10000, 'Failed to fetch Baileys version');
    const { state, saveCreds } = await withTimeout(
      useMultiFileAuthState(SESSION_PATH),
      10000,
      'Failed to load auth state'
    );
    sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' }).child({ level: 'fatal' })),
      },
      printQRInTerminal: process.env.NODE_ENV !== 'production',
      browser: ['Amazing Bot', 'Chrome', '20.0.04'],
      markOnlineOnConnect: true,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      retryRequestDelayMs: 5000,
      maxRetries: 5,
      logger: P({ level: process.env.PINO_LOG_LEVEL || 'silent' }),
      version
    });

    sock.ev.on('connection.update', (update) => handleConnectionEvents(sock, update));
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

    sock.ev.on('messages.reaction', async (reactions) => {
      const handleReaction = (await import('./src/events/messageReaction.js')).default;
      for (const reaction of reactions) {
        await handleReaction(sock, reaction);
      }
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
      logger.error('Max reconnect attempts reached');
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
      await withTimeout(
        fs.writeJSON(filePath, {
          welcome: `Welcome to ${config.botName}!`,
          help: 'Available commands',
          error: 'An error occurred'
        }),
        5000,
        `Failed to write locale: ${locale}`
      );
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
      await withTimeout(fs.ensureDir(path.dirname(filePath)), 5000, `Failed to create directory for ${file}`);
      if (file.endsWith('.png')) {
        await withTimeout(fs.writeFile(filePath, Buffer.from(content, 'base64')), 5000, `Failed to write ${file}`);
      } else {
        await withTimeout(fs.writeFile(filePath, content), 5000, `Failed to write ${file}`);
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
      await withTimeout(
        fs.writeFile(modelPath, `import mongoose from 'mongoose';\n\nexport default mongoose.model('${model.replace('.js', '')}', new mongoose.Schema({}));`),
        5000,
        `Failed to write model: ${model}`
      );
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
      await withTimeout(
        fs.writeFile(routePath, `import express from 'express';\nconst router = express.Router();\n\nrouter.get('/', (req, res) => {\n    res.json({ route: '${routeName}', status: 'active' });\n});\n\nexport default router;`),
        5000,
        `Failed to write route: ${route}`
      );
    }
  }
}

async function createConfigurationFiles() {
  const configFiles = {
    '.env.example': `SESSION_ID=\nOWNER_NUMBERS=254700143167\nPREFIX=.\nPUBLIC_MODE=false\nDATABASE_URL=mongodb://localhost:27017/ilombot\nPORT=5000\nTIMEZONE=Africa/Nairobi\nBOT_NAME=Ilom Bot\nBOT_VERSION=1.0.0\nBOT_THUMBNAIL=https://example.com/logo.png\nBOT_REPOSITORY=https://github.com/Neaterry6/Amazing-Bot-`,
    '.gitignore': `node_modules/\n.env\nsession/\nlogs/\ntemp/\nbackups/\nmedia/cache/\n*.log\n.DS_Store`,
    '.dockerignore': `node_modules/\n.env\nsession/\nlogs/\ntemp/\nbackups/\n*.log\nDockerfile\n.dockerignore\n.git/`
  };
  
  for (const [file, content] of Object.entries(configFiles)) {
    const filePath = path.join(process.cwd(), file);
    if (!await fs.pathExists(filePath)) {
      await withTimeout(fs.writeFile(filePath, content), 5000, `Failed to write ${file}`);
    }
  }
}

async function initializeBot() {
  try {
    await withTimeout(displayStartupBanner(), 5000, 'Failed to display startup banner');
    
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
    await withTimeout(connectToDatabase(), 10000, 'Failed to connect to database');
    
    logger.info('Processing session credentials...');
    await processSessionCredentials();
    
    logger.info('Initializing cache system...');
    await withTimeout(initializeCache(), 5000, 'Failed to initialize cache');
    
    logger.info('Loading command modules...');
    await withTimeout(commandHandler.loadCommands(), 10000, 'Failed to load commands');
    
    logger.info('Loading plugin system...');
    await withTimeout(loadPlugins(), 10000, 'Failed to load plugins');
    
    logger.info('Starting task scheduler...');
    await withTimeout(startScheduler(), 5000, 'Failed to start scheduler');
    
    logger.info('Starting web server...');
    await withTimeout(startWebServer(app), 10000, 'Failed to start web server');
    
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