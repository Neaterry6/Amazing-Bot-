# Overview

Ilom WhatsApp Bot is a comprehensive Node.js WhatsApp automation platform built on the Baileys library. The bot provides 120+ commands across 10 categories including AI chat, media processing, economy systems, games, admin tools, and content downloading. It features multi-platform deployment support, optional database integration, and extensive third-party API integrations for AI, media processing, and content services.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework & WhatsApp Integration

**WhatsApp Connection Layer**
- Built on @whiskeysockets/baileys v6.6.0+ for WhatsApp Web API communication
- Session management with multiple storage formats (local filesystem, cloud platforms)
- QR code authentication with web-based scanner service
- Automatic reconnection handling with configurable retry limits
- Multi-format session support (Mega.nz, local storage, environment variables)

**Runtime & Server**
- Node.js v20+ with ES modules (type: "module")
- Express v5 web server for API, dashboard, and QR scanner (port 3000/5000)
- RESTful API with authentication middleware and rate limiting
- Support for multiple deployment platforms: Replit, Railway, Heroku, Render, Vercel, Koyeb

## Command System Architecture

**Modular Command Structure**
- Category-based organization: 10 folders (admin, ai, downloader, economy, fun, games, general, media, owner, utility)
- Dynamic command loading from filesystem with hot-reload capability
- Command properties: name, aliases, category, description, usage, cooldown, permissions, args validation
- Permission levels: owner, admin, premium, user, banned
- Cooldown system with per-user tracking
- Command statistics and usage analytics

**Command Handler Flow**
- Message parsing and prefix detection (configurable prefix, secondary prefix, no-prefix mode)
- Alias resolution and command lookup
- Permission and cooldown validation
- Anti-spam integration with pattern detection
- Execution context injection (sock, message, args, user, group, from, sender, permissions)

## Data Persistence & Caching

**Database Layer (Optional)**
- MongoDB with Mongoose ODM as primary database
- Graceful fallback when database unavailable (development/Replit mode)
- Models: User, Group, Message, Command logs, Economy, Game state, Settings
- Connection pooling and timeout handling (5s server selection timeout)
- Support for both development (local) and production (cloud) databases

**Caching Strategy**
- Dual-layer caching: NodeCache (in-memory) + optional Redis
- Cache TTL: 3600s default, 1000 max keys
- Statistics tracking: hits, misses, sets, deletes
- Used for rate limiting, command cooldowns, session data

**Session Management**
- Local storage: `cache/auth_info_baileys/` directory
- Cloud platforms: Mega.nz integration for session backup
- Environment variable support for SESSION_ID
- Automatic session persistence and restoration

## AI & External Integrations

**AI Services**
- OpenAI GPT integration for chat and text generation
- Google Gemini AI support as alternative provider
- Conversation history tracking per user
- Rate limiting for AI API calls
- Context-aware responses with conversation memory

**Media Processing**
- FFmpeg for audio/video manipulation (conversion, compression, effects)
- Canvas API for image processing and manipulation
- Node-html-to-image for HTML to image conversion
- Music metadata extraction
- File type detection with mime-types

**Download Services**
- YouTube download via ytdl-core (video/audio, quality selection, 10min limit)
- Multi-platform support: Instagram, TikTok, Facebook, Twitter
- Download queue management (max 3 concurrent)
- Caching of downloaded content
- File size and duration validation

**Third-Party APIs**
- Translation: Google Translate, DeepL
- Weather data integration
- News API services
- Search capabilities
- Webhook support for external integrations

## Security & Performance

**Security Measures**
- JWT authentication for API endpoints
- BCrypt password hashing
- Helmet.js security headers
- CORS configuration
- Webhook signature verification (HMAC SHA-256)
- Rate limiting per endpoint and user
- Input validation with express-validator
- Environment variable protection (no hardcoded credentials)

**Anti-Spam System**
- Message frequency tracking (5 messages per 10s default)
- Pattern detection: repeated characters, caps lock, URLs, mentions
- Similarity checking for duplicate messages
- Violation tracking and automatic banning
- Whitelist support for exempt users
- Admin exemption (configurable)

**Performance Optimization**
- Message queue system with priority handling
- Compression middleware (gzip)
- Request/response logging with Morgan
- Memory usage monitoring
- PM2 ecosystem configuration for production
- Automatic restart on crashes
- Log rotation and archival

## Plugin System

**Extensible Architecture**
- Hot-loadable plugins from `src/plugins/` directory
- Plugin lifecycle: load → activate → execute
- Built-in plugins: AFK, analytics, antiLink, antiSpam, autoDelete, autoReply, autoSticker, backup, chatBot, filter, scheduler, security, typing, welcome
- Plugin state management (loaded, active, error)
- Individual plugin enable/disable control

## Web Dashboard & API

**API Routes**
- `/api/auth` - JWT authentication (login, token refresh)
- `/api/commands` - Command listing, stats, execution
- `/api/groups` - Group info, participants, metadata
- `/api/users` - User management, stats, updates
- `/api/messages` - Message history, send messages
- `/api/settings` - Bot configuration management
- `/api/stats` - System metrics, uptime, resource usage
- `/api/health` - Health checks, service status
- `/api/qr` - QR code generation and image serving
- `/api/webhooks` - External webhook handling

**Middleware Stack**
- Authentication (JWT)
- Rate limiting (configurable per route)
- Compression
- CORS
- Helmet security
- Morgan logging
- Error handling
- Request validation

# External Dependencies

## Core Dependencies

**WhatsApp & Communication**
- @whiskeysockets/baileys ^6.6.0 - WhatsApp Web API client
- qrcode-terminal - QR code display in terminal
- qrcode - QR code generation for web

**Web Server & API**
- express ^5.1.0 - Web framework
- express-session ^1.18.2 - Session management
- express-rate-limit ^8.1.0 - Rate limiting
- express-validator ^7.2.1 - Request validation
- cors ^2.8.5 - Cross-origin resource sharing
- helmet ^8.1.0 - Security headers
- compression ^1.8.1 - Response compression
- morgan ^1.10.1 - HTTP request logging

**Database & Caching**
- mongoose ^8.18.1 - MongoDB ODM
- connect-mongo ^5.1.0 - MongoDB session store
- node-cache ^5.1.2 - In-memory caching
- redis (optional) - Distributed caching

**AI & Machine Learning**
- @google/generative-ai ^0.24.1 - Google Gemini AI
- openai (via axios) - OpenAI GPT integration
- natural ^8.1.0 - Natural language processing

**Media Processing**
- canvas ^3.2.0 - Image manipulation
- fluent-ffmpeg ^2.1.3 - Video/audio processing
- music-metadata ^11.9.0 - Audio metadata extraction
- node-html-to-image ^5.0.0 - HTML to image conversion
- archiver ^7.0.1 - File compression
- megajs ^1.3.9 - Mega.nz cloud storage

**Utilities**
- axios ^1.12.1 - HTTP client
- dotenv ^16.6.1 - Environment variables
- node-cron ^4.2.1 - Task scheduling
- moment ^2.30.1 - Date/time manipulation
- lodash ^4.17.21 - Utility functions
- mathjs ^14.7.0 - Mathematical operations
- chalk ^4.1.2 - Terminal colors
- figlet ^1.9.1 - ASCII art
- gradient-string ^3.0.0 - Gradient text
- fs-extra ^11.3.1 - Enhanced file system
- mime-types ^3.0.1 - MIME type detection
- papaparse ^5.5.3 - CSV parsing

**Authentication & Security**
- jsonwebtoken ^9.0.2 - JWT tokens
- bcryptjs ^3.0.2 - Password hashing
- passport ^0.7.0 - Authentication middleware
- passport-jwt ^4.0.1 - JWT strategy
- passport-local ^1.0.0 - Local auth strategy

**Development Tools**
- nodemon - Development auto-restart
- pm2 - Process management
- winston - Advanced logging
- pino - High-performance logging

## Cloud Platform Integration

**Deployment Platforms**
- Replit - Primary development environment
- Railway - Cloud deployment
- Heroku - PaaS deployment
- Render - Modern cloud platform
- Vercel - Serverless deployment (with vercel.json config)
- Koyeb - Global deployment
- Netlify - JAMstack deployment

**Database Services**
- MongoDB Atlas - Cloud MongoDB
- Redis Cloud - Managed Redis (optional)
- Local MongoDB - Development database

**Session Storage**
- Mega.nz - Cloud session backup
- Local filesystem - Development sessions
- Environment variables - Production sessions