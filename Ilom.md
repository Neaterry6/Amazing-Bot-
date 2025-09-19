# Overview

Ilom WhatsApp Bot is a comprehensive Node.js application built using the latest Baileys library for WhatsApp automation. The bot features AI integration, media processing, economy systems, admin tools, and extensive command management. It's designed as a multi-purpose WhatsApp bot with modular architecture supporting plugins, scheduled tasks, and web-based administration.

**✅ Latest Updates (Sep 2025):**
- Upgraded to Node.js 20+ for optimal performance
- Updated @whiskeysockets/baileys to version 7.0.0-rc.3 for better WhatsApp connectivity
- Enhanced session management with multiple cloud platform support
- Improved deployment configurations for Replit, Railway, Heroku, Render, and more
- 120+ active commands with advanced error handling
- Enhanced cloud environment detection and session persistence

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **WhatsApp Integration**: Built on @whiskeysockets/baileys v7.0.0-rc.3 for WhatsApp Web API communication
- **Node.js Runtime**: v20+ with ES6+ and modern JavaScript features and async/await patterns
- **Express Web Server**: RESTful API and web dashboard for bot management on port 5000
- **Modular Plugin System**: Extensible architecture with hot-reloadable plugins
- **Cloud Platform Support**: Enhanced deployment detection for Replit, Railway, Heroku, Render, Vercel, Netlify, Koyeb

## Command System
- **Category-based Organization**: Commands organized into folders (admin, ai, downloader, economy, fun, games, general, media, owner, utility)
- **Dynamic Loading**: Commands are automatically discovered and loaded from filesystem
- **Permission System**: Multi-level access control (owner, admin, premium, user, banned)
- **Alias Support**: Multiple command names and shortcuts
- **Rate Limiting**: Anti-spam and abuse prevention mechanisms

## Data Management
- **MongoDB Integration**: Primary database using Mongoose ODM
- **Redis Caching**: Optional high-performance caching layer
- **Session Management**: WhatsApp authentication state persistence
- **File Storage**: Local filesystem for media and temporary files

## AI and External Services
- **Multi-AI Support**: Integration with OpenAI GPT and Google Gemini
- **Media Processing**: FFmpeg for audio/video manipulation, Canvas for image processing
- **Download Services**: Support for YouTube, Instagram, TikTok, Facebook, Twitter, and other platforms
- **Translation**: Google Translate and DeepL integration
- **Weather and News**: External API integrations for information services

## Security and Performance
- **Anti-Spam System**: Message frequency and pattern detection
- **Rate Limiting**: Request throttling per user and command type
- **Input Validation**: Comprehensive validation utilities for all user inputs
- **Error Handling**: Centralized error management with logging
- **Memory Management**: Garbage collection optimization and resource monitoring

## Messaging and Events
- **Message Queue**: Asynchronous message processing with priority support
- **Event-Driven Architecture**: Handlers for various WhatsApp events (messages, calls, group updates)
- **Auto-Reply System**: Configurable automated responses
- **Group Management**: Admin tools for group moderation and settings

## Deployment and Monitoring
- **PM2 Process Manager**: Production deployment with auto-restart and clustering
- **Docker Support**: Containerized deployment options
- **Logging System**: Winston-based multi-level logging with file rotation
- **Backup System**: Automated database and session backups
- **Health Monitoring**: System status endpoints and performance metrics

# External Dependencies

## Core WhatsApp Integration
- **@whiskeysockets/baileys**: v7.0.0-rc.3 - WhatsApp Web API library for bot functionality
- **qrcode**: QR code generation for WhatsApp authentication (when no session provided)
- **Session Management**: Supports multiple session formats including base64, JSON, and Ilom~ prefixed sessions

## Database and Caching
- **mongoose**: MongoDB object modeling and database operations
- **redis**: Optional high-performance caching and session storage
- **node-cache**: In-memory caching fallback

## AI and Machine Learning
- **@google/generative-ai**: Google Gemini AI integration
- **openai**: OpenAI GPT API client (configured via axios)
- **compromise**: Natural language processing library
- **franc**: Language detection for translation services

## Media Processing
- **ffmpeg** (system dependency): Required for audio/video processing
- **fluent-ffmpeg**: Node.js wrapper for FFmpeg
- **canvas**: Image manipulation and generation
- **sharp**: High-performance image processing
- **gm** (GraphicsMagick): Alternative image processing backend

## Web Framework
- **express**: Web server and REST API framework
- **cors**: Cross-origin resource sharing middleware
- **helmet**: Security headers and protection
- **compression**: Response compression middleware
- **express-rate-limit**: Request rate limiting
- **express-session**: Session management
- **express-fileupload**: File upload handling

## Download Services
- **ytdl-core**: YouTube video/audio downloading
- **axios**: HTTP client for external API requests
- **cheerio**: HTML parsing for web scraping
- **archiver**: File compression and backup creation

## Translation and Localization
- **google-translate-api**: Google Translate integration
- **deepl**: DeepL translation service
- **i18n**: Internationalization support with multiple language files

## Utility Libraries
- **dotenv**: Environment variable management
- **winston**: Advanced logging framework
- **chalk**: Terminal color output
- **figlet**: ASCII art text generation
- **gradient-string**: Gradient text styling
- **fs-extra**: Enhanced file system operations
- **node-cron**: Task scheduling and automation
- **bcryptjs**: Password hashing and security
- **validator**: Input validation utilities

## Development and Testing
- **nodemon**: Development auto-restart
- **eslint**: Code linting and style enforcement
- **jest**: Testing framework
- **pm2**: Production process management
