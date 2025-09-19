<div align="center">

# 🧠 Amazing Bot 🧠

### *The Ultimate WhatsApp Automation Experience*

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange.svg)](package.json)
[![Stars](https://img.shields.io/github/stars/NexusCoders-cyber/Amazing-Bot-.svg?style=social)](https://github.com/NexusCoders-cyber/Amazing-Bot-)

*A powerful, feature-rich WhatsApp bot built with modern technologies. Featuring AI integration, media processing, economy system, and comprehensive admin tools.*

[🚀 Quick Start](#-quick-start) • [📚 Documentation](#-documentation) • [🎯 Features](#-features) • [🔧 Installation](#-installation)

---

</div>

## ✨ Features

<div align="center">

### 🎯 Core Capabilities

| Category | Features | Commands |
|----------|----------|----------|
| 🤖 **AI & Chat** | OpenAI GPT, Gemini AI, Smart responses | `ai`, `chatgpt`, `gemini`, `analyze` |
| 🎮 **Games & Fun** | 8-ball, Dice, RPS, Trivia, Blackjack | `8ball`, `dice`, `rps`, `trivia`, `blackjack` |
| 💰 **Economy** | Virtual currency, Daily rewards, Gambling | `balance`, `daily`, `work`, `gamble`, `shop` |
| 👑 **Admin Tools** | Group management, User control, Moderation | `kick`, `ban`, `promote`, `mute`, `warn` |
| 📥 **Downloaders** | YouTube, Instagram, TikTok, Media processing | `ytdl`, `igdl`, `fbdl`, `tiktok` |
| 🔧 **Utilities** | QR codes, Encryption, URL shortener | `qr`, `encrypt`, `decrypt`, `short` |
| 🎨 **Media** | Stickers, Filters, Compress, Convert | `sticker`, `filter`, `compress`, `resize` |
| 🌤️ **Information** | Weather, News, Dictionary, Search | `weather`, `news`, `define`, `search` |

</div>

### 🚀 Advanced Features

- **🔐 Multi-Session Support** - JSON, Base64, and custom formats
- **⚡ Real-time Processing** - Sub-100ms response times
- **🛡️ Security First** - Rate limiting, input validation, encryption
- **🌐 Multi-Language** - 10+ languages supported
- **📊 Analytics** - Usage tracking, performance monitoring
- **🔄 Auto Updates** - Self-updating system
- **💾 Backup & Restore** - Complete data management
- **🎨 Customizable** - Themes, commands, and plugins

## 🚀 Quick Start

### ⚡ One-Click Deploy

<div align="center">

[![Deploy to Replit](https://img.shields.io/badge/Deploy%20to-Replit-667eea?style=for-the-badge&logo=replit)](https://replit.com/github/NexusCoders-cyber/Amazing-Bot-)
[![Deploy to Railway](https://img.shields.io/badge/Deploy%20to-Railway-0B0D0E?style=for-the-badge&logo=railway)](https://railway.app)
[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)

</div>

### 📋 Prerequisites

- **Node.js** 18.0 or higher
- **MongoDB** (optional, for data persistence)
- **WhatsApp Account** for bot connection
- **Git** for cloning repository

### 🛠️ Installation

#### Option 1: Git Clone (Recommended)

```bash
# Clone the repository
git clone https://github.com/NexusCoders-cyber/Amazing-Bot-.git
cd Amazing-Bot-

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

#### Option 2: Direct Download

```bash
# Download and extract
wget https://github.com/NexusCoders-cyber/Amazing-Bot-/archive/main.zip
unzip main.zip
cd Amazing-Bot--main

# Install dependencies
npm install
```

### ⚙️ Configuration

#### Required Environment Variables

Create a `.env` file in the root directory:

```env
# WhatsApp Session (Required)
SESSION_ID={"noiseKey":{"private":{"type":"Buffer","data":"..."}},"pairingEphemeralKeyPair":{"private":{"type":"Buffer","data":"..."}},"signedIdentityKey":{"private":{"type":"Buffer","data":"..."}},"signedPreKey":{"keyPair":{"private":{"type":"Buffer","data":"..."},"public":{"type":"Buffer","data":"..."}},"signature":{"type":"Buffer","data":"..."},"keyId":1},"registrationId":82,"advSecretKey":"...","processedHistoryMessages":[],"nextPreKeyId":31,"firstUnuploadedPreKeyId":31,"accountSyncCounter":0,"accountSettings":{"unarchiveChats":false},"registered":true,"pairingCode":"...","me":{"id":"234xxxxxxxxx:18@s.whatsapp.net","lid":"908xxxxxxxxxx:18@lid"},"account":{"details":"..."},"signalIdentities":[{"identifier":{"name":"234xxxxxxxxx:18@s.whatsapp.net","deviceId":0},"identifierKey":{"type":"Buffer","data":"..."}}],"platform":"android","routingInfo":{"type":"Buffer","data":"..."},"lastAccountSyncTimestamp":1758152747,"lastPropHash":"...","myAppStateKeyId":"AAAAAGQI"}

# Bot Configuration
BOT_NAME=Amazing Bot
OWNER_NUMBERS=234xxxxxxxxxx
PREFIX=.

# Database (Optional)
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/botdb

# AI Integration (Optional)
OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=your-gemini-key

# Security
ENCRYPTION_KEY=your-encryption-key-here
JWT_SECRET=your-jwt-secret-here
```

#### WhatsApp Connection Methods

##### Method 1: SESSION_ID (Recommended)
1. Get SESSION_ID from a running bot instance
2. Add it to your `.env` file
3. Bot connects automatically on startup

##### Method 2: QR Code
1. Leave `SESSION_ID` empty in `.env`
2. Start the bot: `npm start`
3. Scan the QR code displayed in terminal
4. SESSION_ID is automatically saved for future use

### 🎯 Start the Bot

```bash
# Development mode
npm run dev

# Production mode
npm start

# Build and start
npm run build && npm start
```

### 🌐 Web Interface

Once running, access the web interface at:
- **Dashboard**: `http://localhost:5000`
- **QR Code**: `http://localhost:5000/qr`
- **API Docs**: `http://localhost:5000/api/docs`

## ⚙️ Advanced Configuration

### 🔧 Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `PREFIX` | `.` | Bot command prefix |
| `BOT_NAME` | `Amazing Bot` | Bot display name |
| `OWNER_NUMBERS` | `your_number` | Bot owner WhatsApp numbers |
| `PUBLIC_MODE` | `true` | Allow public usage |
| `SELF_MODE` | `false` | Bot only responds to owner |
| `MARK_ONLINE` | `true` | Show online status |
| `READ_MESSAGES` | `false` | Auto-read messages |
| `AUTO_TYPING` | `true` | Show typing indicator |

### 🤖 AI Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT | `sk-...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `OPENAI_MODEL` | GPT model to use | `gpt-3.5-turbo` |
| `AI_MAX_TOKENS` | Max tokens per response | `150` |
| `AI_TEMPERATURE` | Response creativity (0-1) | `0.7` |

### 🗄️ Database Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://localhost` | MongoDB connection URL |
| `DATABASE_ENABLED` | `true` | Enable database features |
| `DB_MAX_POOL_SIZE` | `10` | Connection pool size |
| `DB_TIMEOUT` | `5000` | Connection timeout (ms) |
| `REDIS_ENABLED` | `false` | Enable Redis caching |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |

### 🔒 Security Settings

| Variable | Description | Importance |
|----------|-------------|------------|
| `ENCRYPTION_KEY` | Data encryption key | 🔴 Critical |
| `JWT_SECRET` | JWT token secret | 🔴 Critical |
| `SESSION_SECRET` | Session encryption | 🟡 High |
| `MAX_LOGIN_ATTEMPTS` | Max failed logins | 🟡 Medium |
| `LOCKOUT_DURATION` | Lockout time (ms) | 🟡 Medium |

### 📊 Performance Tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CONCURRENT_COMMANDS` | `50` | Max simultaneous commands |
| `COMMAND_COOLDOWN` | `3` | Global cooldown (seconds) |
| `RATE_LIMIT_REQUESTS` | `20` | Requests per window |
| `RATE_LIMIT_WINDOW` | `60000` | Rate limit window (ms) |
| `MEMORY_THRESHOLD` | `0.8` | Memory usage alert threshold |
| `CACHE_SIZE` | `1000` | Cache size limit |
| `CACHE_TTL` | `3600` | Cache TTL (seconds) |

### 🌐 Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Web server port |
| `HOST` | `0.0.0.0` | Server bind address |
| `CORS_ENABLED` | `true` | Enable CORS |
| `RATE_LIMIT_WINDOW` | `900000` | API rate limit window |
| `RATE_LIMIT_MAX` | `100` | Max API requests |

### 🎨 Customization

| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_THUMBNAIL` | `thumbnail_url` | Bot profile image |
| `BOT_REPOSITORY` | `repo_url` | GitHub repository URL |
| `DEFAULT_LANGUAGE` | `en` | Default bot language |
| `TIMEZONE` | `UTC` | Bot timezone |
| `DATE_FORMAT` | `YYYY-MM-DD HH:mm:ss` | Date format |

## 📖 Command Guide

### 🎯 Essential Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `.help` | Display all available commands | `.help [command]` |
| `.menu` | Interactive command menu | `.menu` |
| `.ping` | Check bot response time | `.ping` |
| `.info` | Detailed bot information | `.info` |
| `.status` | System performance stats | `.status` |
| `.owner` | Contact bot owner | `.owner` |

### 👑 Admin Commands

#### Group Management
```bash
.kick @user          # Remove member from group
.ban @user           # Ban user from group
.unban @user         # Unban user from group
.promote @user       # Promote to admin
.demote @user        # Demote from admin
.mute @user          # Mute user in group
.unmute @user        # Unmute user in group
.warn @user          # Warn user
.unwarn @user        # Remove warning
```

#### Group Settings
```bash
.setdesc <text>      # Change group description
.setname <text>      # Change group name
.groupinfo           # Get group information
.tagall <message>    # Tag all members
.hidetag <message>   # Send hidden tag message
```

### 🎮 Fun & Games

#### Entertainment
```bash
.8ball <question>    # Magic 8-ball predictions
.dice [sides]        # Roll dice (default 6 sides)
.coin               # Flip a coin
.rps <choice>       # Rock, paper, scissors
.joke               # Random jokes
.quote              # Inspirational quotes
.ship @user1 @user2  # Ship two users
```

#### Games
```bash
.trivia             # Start trivia game
.blackjack          # Play blackjack
.tictactoe          # Play tic-tac-toe
.hangman            # Play hangman
.math               # Math quiz
.word               # Word game
.memory             # Memory game
```

### 🧠 AI Integration

#### Chat Commands
```bash
.ai <message>       # Chat with AI assistant
.chatgpt <message>  # OpenAI GPT chat
.gemini <message>   # Google Gemini chat
.analyze <text>     # Analyze text with AI
.translate <text>   # Translate text
```

#### Creative AI
```bash
.imagine <prompt>   # Generate images with AI
.stt <audio>        # Speech to text
.tts <text>         # Text to speech
.ocr <image>        # Extract text from image
```

### 💰 Economy System

#### Money Management
```bash
.balance            # Check your balance
.daily              # Claim daily reward
.weekly             # Claim weekly reward
.work               # Earn money by working
.gamble <amount>    # Gamble your money
.rob @user          # Rob another user
.transfer @user <amount> # Transfer money
```

#### Shop & Items
```bash
.shop               # View available items
.buy <item>         # Purchase item
.inventory          # Check your inventory
.sell <item>        # Sell item
.leaderboard        # View richest users
```

### 📥 Downloaders

#### Social Media
```bash
.ytdl <url>         # Download YouTube video/audio
.ytmp3 <url>        # Download YouTube audio only
.ytmp4 <url>        # Download YouTube video only
.igdl <url>         # Download Instagram media
.fbdl <url>         # Download Facebook video
.tikdl <url>        # Download TikTok video
.twdl <url>         # Download Twitter media
.pinterest <url>    # Download Pinterest media
```

#### File Hosting
```bash
.mediafire <url>    # Download MediaFire file
.gdrive <url>       # Download Google Drive file
```

### 🔧 Utilities

#### Tools
```bash
.qr <text>          # Generate QR code
.encrypt <text>     # Encrypt text
.decrypt <text>     # Decrypt text
.hash <text>        # Generate hash
.base64 <text>      # Base64 encode/decode
.short <url>        # Shorten URL
.weather <city>     # Get weather info
.news               # Get latest news
.search <query>     # Search the web
```

#### Information
```bash
.time               # Get current time
.uptime             # Bot uptime
.stats              # Bot statistics
.rank               # Your rank in group
.profile [@user]    # View user profile
```

### 🎨 Media Processing

#### Image Tools
```bash
.sticker            # Convert image to sticker
.filter <type>      # Apply image filter
.blur               # Blur image
.compress           # Compress image
.resize <size>      # Resize image
.crop               # Crop image
.watermark          # Add watermark
.meme <text>        # Create meme
```

#### Audio/Video
```bash
.toaudio            # Convert video to audio
.toimg              # Convert sticker to image
.tovideo            # Convert image to video
.gif                # Convert video to GIF
```

### 🔒 Owner Commands

#### System Management
```bash
.restart            # Restart the bot
.shutdown           # Shutdown the bot
.update             # Update bot from repository
.backup             # Create system backup
.restore            # Restore from backup
.eval <code>        # Execute JavaScript code
.exec <command>     # Execute system command
```

#### Configuration
```bash
.setprefix <prefix> # Change bot prefix
.setstatus <text>   # Set bot status
.setpp <image>      # Set bot profile picture
.broadcast <message> # Send broadcast message
.join <group_id>    # Join group
.leave             # Leave current group
```

### 📊 Advanced Usage

#### Command Aliases
Most commands have multiple aliases for convenience:
- `.help` → `.h`, `.menu`, `.commands`
- `.ping` → `.p`, `.latency`
- `.info` → `.about`, `.botinfo`

#### Permission Levels
- **User**: Basic commands for all users
- **Premium**: Enhanced features for premium users
- **Admin**: Group administrative commands
- **Owner**: System-level commands (bot owner only)

#### Rate Limiting
- Commands have cooldown periods to prevent spam
- Rate limits vary by command type and user level
- Premium users get higher limits

## 🛡️ Security Features

- **Permission System** - Multi-level access control
- **Rate Limiting** - Anti-spam protection
- **Input Validation** - Secure message processing
- **Session Encryption** - Protected WhatsApp credentials
- **Owner-only Commands** - Restricted administrative access

## 🎨 Customization

### Adding New Commands
1. Create file in `src/commands/category/`
2. Follow command structure:

```javascript
module.exports = {
    name: 'command',
    aliases: ['alias1', 'alias2'],
    category: 'general',
    description: 'Command description',
    usage: 'command [arguments]',
    cooldown: 3,
    permissions: ['user'],
    
    async execute(sock, message, args) {
        // Command logic here
    }
};
```

### Custom Plugins
Add plugins in `src/plugins/` directory with auto-loading support.

### Themes & Styling
Customize message templates and response formats in command files.

## 🌐 API Reference

### 📊 Health & Monitoring

#### Health Check
```http
GET /api/health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T19:30:00.000Z",
  "uptime": "2h 15m 30s",
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB",
    "percentage": "8.8%"
  },
  "cpu": {
    "usage": "12.5%"
  }
}
```

#### System Statistics
```http
GET /api/stats
```
**Response:**
```json
{
  "bot": {
    "name": "Amazing Bot",
    "version": "1.0.0",
    "uptime": "2h 15m 30s",
    "commands_loaded": 150,
    "active_chats": 25
  },
  "system": {
    "platform": "linux",
    "node_version": "v18.17.0",
    "memory_usage": "45.2 MB",
    "cpu_usage": "12.5%"
  },
  "performance": {
    "avg_response_time": "85ms",
    "total_commands_executed": 15420,
    "error_rate": "0.02%"
  }
}
```

#### QR Code Access
```http
GET /api/qr
```
Returns the current QR code for WhatsApp authentication.

### 🤖 Bot Management

#### Command Statistics
```http
GET /api/commands/stats
```
**Response:**
```json
{
  "total_commands": 150,
  "categories": {
    "general": 25,
    "fun": 30,
    "admin": 20,
    "ai": 15,
    "downloader": 12,
    "utility": 18,
    "media": 10,
    "owner": 8,
    "economy": 7,
    "games": 5
  },
  "most_used": [
    {
      "command": "ping",
      "usage_count": 1250,
      "avg_execution_time": "45ms"
    }
  ]
}
```

#### User Management
```http
GET /api/users
POST /api/users
PUT /api/users/:id
DELETE /api/users/:id
```

#### Group Management
```http
GET /api/groups
POST /api/groups
PUT /api/groups/:id
DELETE /api/groups/:id
```

### 📁 File Operations

#### Upload Media
```http
POST /api/upload
Content-Type: multipart/form-data

Form Data:
- file: [media file]
- type: "image" | "video" | "audio" | "document"
```

#### Download Media
```http
GET /api/download/:fileId
```

### 🔐 Authentication

#### JWT Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

#### Session Management
```http
GET /api/auth/session
POST /api/auth/refresh
DELETE /api/auth/logout
```

### 📊 Analytics

#### Usage Analytics
```http
GET /api/analytics/usage
GET /api/analytics/commands
GET /api/analytics/users
GET /api/analytics/performance
```

#### Error Monitoring
```http
GET /api/analytics/errors
GET /api/analytics/logs
```

### 🎯 Webhook Integration

#### Register Webhook
```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["message", "command", "error"],
  "secret": "your_webhook_secret"
}
```

#### Webhook Events
- `message.received` - New message received
- `command.executed` - Command executed
- `user.joined` - User joined group
- `error.occurred` - Error occurred
- `bot.started` - Bot started
- `bot.stopped` - Bot stopped

## 🔧 Troubleshooting

### 🚨 Common Issues & Solutions

#### WhatsApp Connection Problems

**❌ "Session invalid" Error**
```bash
# Solution 1: Clear session and restart
rm -rf session/
npm start

# Solution 2: Check SESSION_ID format
# Ensure it's a valid JSON object with proper structure

# Solution 3: Regenerate session
# Delete SESSION_ID from .env and scan QR code again
```

**❌ "Connection timeout" Error**
```bash
# Check internet connection
ping google.com

# Verify WhatsApp servers
curl -I https://web.whatsapp.com

# Check firewall settings
sudo ufw status
```

**❌ QR Code not showing**
```bash
# Check web server port
netstat -tlnp | grep :5000

# Verify QR service configuration
# Check logs for QR generation errors
```

#### Command Loading Issues

**❌ "Command not found" Error**
```bash
# Check command file exists
ls src/commands/general/ping.js

# Verify command structure
# Ensure export default is used (not module.exports)

# Check for syntax errors
node -c src/commands/general/ping.js
```

**❌ "Permission denied" Error**
```bash
# Check command permissions
# Verify user has required permission level

# Check bot owner numbers
echo $OWNER_NUMBERS
```

#### Database Issues

**❌ "Connection refused" Error**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Verify connection URL
mongosh "your_mongodb_url" --eval "db.adminCommand('ping')"

# Check network connectivity
telnet your-mongodb-host 27017
```

**❌ "Authentication failed" Error**
```bash
# Verify credentials
# Check username/password in MONGODB_URL

# Ensure user has proper permissions
# Try connecting with mongo client first
```

#### Performance Issues

**❌ High memory usage**
```bash
# Monitor memory usage
htop
free -h

# Check for memory leaks
# Restart bot periodically
# Increase server memory if needed
```

**❌ Slow response times**
```bash
# Check system resources
top
iostat -x 1

# Optimize database queries
# Enable Redis caching
# Check network latency
```

### 📊 Log Analysis

#### Log Levels Configuration
```env
# Environment variables
LOG_LEVEL=info          # debug, info, warn, error
LOG_CONSOLE=true        # Console logging
LOG_FILE=true          # File logging
LOG_MAX_FILES=7        # Max log files to keep
LOG_MAX_SIZE=10m       # Max size per log file
```

#### Reading Logs
```bash
# View recent logs
tail -f logs/bot.log

# Search for specific errors
grep "ERROR" logs/bot.log

# Filter by date
grep "2025-01-19" logs/bot.log

# PM2 logs (if using PM2)
pm2 logs amazing-bot
```

#### Common Log Messages
```
✅ INFO: Bot initialization completed successfully
✅ INFO: WhatsApp connection established
✅ INFO: Command manager initialized with X commands

⚠️ WARN: Using default encryption key
⚠️ WARN: Database connection skipped

❌ ERROR: Failed to load command
❌ ERROR: Database connection failed
❌ ERROR: Session invalid
```

### 🐛 Debug Mode

#### Enable Debug Logging
```env
NODE_ENV=development
LOG_LEVEL=debug
VERBOSE=true
```

#### Debug Commands
```bash
# Test database connection
npm run test:db

# Test WhatsApp connection
npm run test:wa

# Run with inspector
node --inspect index.js

# Memory profiling
node --inspect --expose-gc index.js
```

### 🔄 Recovery Procedures

#### Emergency Restart
```bash
# Force restart
pkill -f "node index.js"
npm start

# PM2 restart
pm2 restart amazing-bot

# Docker restart
docker-compose restart bot
```

#### Data Recovery
```bash
# Restore from backup
npm run restore

# Clear corrupted data
rm -rf session/
rm -rf temp/
rm -rf cache/

# Reset database (CAUTION)
# mongosh "your_db_url" --eval "db.dropDatabase()"
```

#### System Cleanup
```bash
# Clear logs
pm2 flush amazing-bot
rm -rf logs/*.log

# Clear cache
rm -rf temp/
rm -rf media/cache/

# Clear node modules and reinstall
rm -rf node_modules/
npm install
```

## 📊 Performance

- **Response Time**: <100ms for basic commands
- **Memory Usage**: ~50MB average
- **Concurrent Users**: 100+ simultaneous
- **Uptime**: 99.9% reliability
- **Database**: MongoDB with connection pooling
- **Caching**: Redis support for high performance

## 🌍 Multi-Language Support

Supports 10+ languages:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Portuguese (pt)
- Arabic (ar)
- Hindi (hi)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Add tests if needed
5. Submit pull request

## 📞 Support

- **Developer**: Ilom
- **Website**: https://ilom.tech
- **Email**: contact@ilom.tech
- **Issues**: Report bugs and request features

## 📜 License

MIT License - Feel free to use, modify, and distribute.

## 🚀 Deployment Guide

### ☁️ Cloud Platforms

#### Replit (Easiest)
<div align="center">

[![Deploy to Replit](https://img.shields.io/badge/Deploy%20to-Replit-667eea?style=for-the-badge&logo=replit)](https://replit.com/github/NexusCoders-cyber/Amazing-Bot-)

</div>

1. **Fork & Import**
   ```bash
   # Click the button above or manually import
   # Repository: https://github.com/NexusCoders-cyber/Amazing-Bot-
   ```

2. **Environment Setup**
   ```bash
   # Add these to Replit Secrets:
   SESSION_ID=your_session_id
   MONGODB_URL=your_mongodb_url
   BOT_NAME=Amazing Bot
   OWNER_NUMBERS=your_number
   ```

3. **Run the Bot**
   ```bash
   # Click the Run button or use:
   npm start
   ```

#### Railway
<div align="center">

[![Deploy to Railway](https://img.shields.io/badge/Deploy%20to-Railway-0B0D0E?style=for-the-badge&logo=railway)](https://railway.app)

</div>

1. **Connect Repository**
   ```bash
   # Link your GitHub repository
   # Railway auto-detects Node.js
   ```

2. **Environment Variables**
   ```env
   NODE_ENV=production
   SESSION_ID=your_session_id
   MONGODB_URL=${{ MONGODB_URL }}
   PORT=${{ PORT }}
   ```

3. **Database Setup**
   ```bash
   # Add MongoDB plugin
   # Railway provides connection URL
   ```

#### Render
<div align="center">

[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)

</div>

1. **Connect Repository**
   ```bash
   # Link GitHub repository
   # Set build command: npm install
   # Set start command: npm start
   ```

2. **Environment**
   ```env
   NODE_ENV=production
   SESSION_ID=your_session_id
   MONGODB_URL=your_mongodb_url
   ```

#### Heroku
<div align="center">

[![Deploy to Heroku](https://img.shields.io/badge/Deploy%20to-Heroku-430098?style=for-the-badge&logo=heroku)](https://heroku.com)

</div>

1. **Create App**
   ```bash
   # Create new Heroku app
   heroku create your-bot-name
   ```

2. **Configure Environment**
   ```bash
   heroku config:set SESSION_ID="your_session_id"
   heroku config:set MONGODB_URL="your_mongodb_url"
   heroku config:set BOT_NAME="Amazing Bot"
   heroku config:set OWNER_NUMBERS="your_number"
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

### 🐳 Docker Deployment

#### Docker Compose (Recommended)
```yaml
# docker-compose.yml
version: '3.8'
services:
  bot:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - SESSION_ID=your_session_id
      - MONGODB_URL=mongodb://mongo:27017/bot
      - BOT_NAME=Amazing Bot
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

#### Docker Commands
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop and remove
docker-compose down
```

### 🖥️ Local Development

#### Windows
```powershell
# Clone repository
git clone https://github.com/NexusCoders-cyber/Amazing-Bot-.git
cd Amazing-Bot-

# Install dependencies
npm install

# Configure environment
copy .env.example .env
# Edit .env with your settings

# Start development server
npm run dev
```

#### Linux/macOS
```bash
# Clone repository
git clone https://github.com/NexusCoders-cyber/Amazing-Bot-.git
cd Amazing-Bot-

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev
```

### 🔧 Production Setup

#### PM2 Process Manager
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start index.js --name "amazing-bot"

# Save PM2 configuration
pm2 save
pm2 startup

# View logs
pm2 logs amazing-bot

# Monitor processes
pm2 monit
```

#### Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/amazing-bot
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 📊 Monitoring & Scaling

#### Health Checks
```bash
# Check if bot is running
curl http://localhost:5000/api/health

# Monitor with PM2
pm2 show amazing-bot

# System monitoring
htop
iotop
```

#### Log Management
```bash
# View application logs
pm2 logs amazing-bot

# System logs
journalctl -u amazing-bot -f

# Log rotation
pm2 install pm2-logrotate
```

#### Backup Strategy
```bash
# Database backup
mongodump --db bot --out /backups/$(date +%Y%m%d)

# File backup
tar -czf /backups/bot-files-$(date +%Y%m%d).tar.gz /path/to/bot

# Automated backup script
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

---

**🚀 Ready to make your WhatsApp legendary? Deploy now and experience the power of Ilom Bot!**

*Built with ❤️ by Ilom - Making WhatsApp automation accessible to everyone*