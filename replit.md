# Overview

This is a comprehensive WhatsApp automation bot built with Node.js, utilizing the Baileys library for WhatsApp Web API integration. The bot features AI capabilities, media processing, an economy system, admin tools, and over 120 commands across multiple categories. It's designed for deployment on various cloud platforms including Replit, Railway, Heroku, and Render.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## October 2, 2025 - Bot Setup and Module System Fix

**Problem:** Bot was failing to start due to module system incompatibility between CommonJS and ES modules
**Changes Made:**
1. **Environment Configuration:** Added OWNER_NUMBERS environment variable (2348180146181) to enable startup status notifications to owner's WhatsApp
2. **API Routes Migration:** Converted all 10 API route files from CommonJS to ES modules:
   - auth.js, commands.js, groups.js, health.js, messages.js
   - qr.js, settings.js, stats.js, users.js, webhooks.js
   - Changed from `module.exports` to `export default`
   - Updated imports from `require()` to `import` statements
3. **Web Server Fix:** Updated webServer.js route loading to properly handle ES module default exports
   - Fixed route import to access `.default` property for ES modules
   - Added port conflict handling with automatic fallback to alternative ports
   - Improved error handling and Promise-based server startup
4. **Status:** All 10 API routes now loading successfully, web server running on port 5000

**Current State:**
- ✅ Web server operational on port 5000
- ✅ All API endpoints accessible (/api/auth, /api/commands, /api/groups, etc.)
- ✅ Bot initialization complete
- 🔄 WhatsApp connection authenticating (normal cloud startup process)
- 📱 Startup notification configured to send to owner (2348180146181) once WhatsApp connects

# System Architecture

## Core Framework and WhatsApp Integration

**Problem:** Need reliable WhatsApp automation with session persistence across restarts
**Solution:** Built on @whiskeysockets/baileys v6.6.0+ with multi-format session management
**Architecture:**
- Baileys library handles WhatsApp Web protocol communication
- Session credentials stored in `cache/auth_info_baileys` directory
- Support for JSON and Base64 session formats via environment variables
- QR code generation service for initial authentication
- Automatic reconnection handling with exponential backoff (max 3 attempts)

**Rationale:** Baileys provides a stable, actively maintained WhatsApp Web API wrapper. Session persistence through filesystem and environment variables enables seamless deployment across different hosting platforms.

## Command System Architecture

**Problem:** Need extensible, organized command handling with permissions and rate limiting
**Solution:** Category-based plugin architecture with dynamic loading
**Design:**
- Commands organized in folders: admin, ai, downloader, economy, fun, games, general, media, owner, utility
- Each command exports default object with name, aliases, category, execute function
- CommandHandler class manages command registration, aliases, and execution
- Built-in cooldown system prevents spam (configurable per command)
- Permission levels: owner, admin, premium, user, banned
- Rate limiting per user and command type via RateLimiter utility

**Rationale:** Modular approach allows easy addition of new commands without modifying core. Permission system ensures security. Rate limiting prevents abuse.

## Message Processing Pipeline

**Problem:** Handle various message types, quoted messages, media, and maintain context
**Solution:** MessageHandler with queue-based processing
**Flow:**
1. Raw message received from Baileys connection
2. Message content extracted (text, media, quoted context)
3. User and group data fetched/created in database
4. Anti-spam checks performed
5. Command detection (prefix-based or no-prefix in private)
6. Command execution with context injection
7. Response sent with error handling

**Rationale:** Queue-based approach prevents message loss during high load. Context injection provides commands with all necessary data (sender, group info, permissions).

## Data Persistence

**Problem:** Store user data, groups, economy, settings without requiring database in development
**Solution:** MongoDB with Mongoose ODM, with graceful degradation
**Models:**
- User: jid, phone, name, ban status, economy balance, permissions
- Group: jid, name, settings (antilink, welcome), admin list
- Message: messageId, sender, content, timestamp (for logging)
- Command: usage logs for analytics

**Fallback:** When MongoDB unavailable (local dev, Replit), database operations return mock data, bot remains functional
**Rationale:** MongoDB provides flexible schema for WhatsApp data. Mongoose simplifies queries. Fallback ensures development without infrastructure dependencies.

## AI Integration

**Problem:** Provide intelligent responses using multiple AI providers
**Solution:** AIService abstraction layer
**Supported:**
- OpenAI GPT (3.5/4) via REST API
- Google Gemini via GenerativeAI SDK
- Conversation history tracking per user
- Rate limiting to prevent API quota exhaustion

**Implementation:** AIService maintains client instances, handles API authentication, manages conversation context in Map, implements exponential backoff for failures.

**Rationale:** Abstraction allows swapping providers. Per-user context enables coherent conversations. Rate limiting protects against cost overruns.

## Media Processing

**Problem:** Handle diverse media formats (images, videos, audio, stickers)
**Solution:** MediaHandler with FFmpeg and Canvas integration
**Capabilities:**
- Image manipulation via Canvas (filters, resize, compress)
- Video/audio conversion via FFmpeg
- Sticker creation from images/videos
- Media download from URLs
- File format validation and size limits

**Rationale:** FFmpeg provides robust media transcoding. Canvas enables image manipulation in Node. Size limits prevent memory exhaustion.

## Web Server and API

**Problem:** Provide web interface for monitoring and external integrations
**Solution:** Express.js REST API
**Endpoints:**
- `/health` - System health checks
- `/api/stats` - Bot statistics
- `/api/qr` - QR code for pairing
- `/api/commands` - Command listing
- `/api/messages` - Message sending
- `/api/users` - User management
- `/api/groups` - Group management

**Security:** JWT authentication, rate limiting (express-rate-limit), helmet for headers, CORS configured
**Rationale:** Express is lightweight and well-supported. JWT provides stateless auth. Rate limiting prevents API abuse.

## Caching Strategy

**Problem:** Reduce database queries and API calls
**Solution:** Dual-layer caching with NodeCache and optional Redis
**Architecture:**
- NodeCache for in-memory caching (default, no dependencies)
- Redis for distributed caching (optional, for multi-instance)
- Configurable TTL per cache type
- Automatic invalidation on data updates

**Rationale:** In-memory cache sufficient for single-instance. Redis enables scaling to multiple instances with shared cache.

## Error Handling and Logging

**Problem:** Track errors, debug issues, maintain application stability
**Solution:** Winston logger with multiple transports
**Features:**
- File-based logging (logs directory)
- Console output with color coding
- Log rotation to prevent disk fill
- Error tracking with counts to prevent log spam
- Separate error file for critical issues

**Process Management:** Graceful shutdown handlers for uncaught exceptions and unhandled rejections
**Rationale:** Winston provides flexible logging. File persistence aids debugging production issues. Graceful shutdown prevents data loss.

## Scheduler System

**Problem:** Run periodic tasks (cleanup, backups, statistics)
**Solution:** Node-cron based TaskScheduler
**Tasks:**
- Database cleanup (old messages, expired bans)
- Session backup
- Statistics aggregation
- Cache cleanup

**Rationale:** Cron syntax familiar to developers. Event-driven approach allows dynamic task registration.

## Anti-Spam and Security

**Problem:** Prevent abuse, spam, and malicious usage
**Solution:** Multi-layered protection
**Mechanisms:**
- Message frequency tracking per user
- Pattern detection (repeated chars, caps lock, URLs)
- Automatic violation tracking with escalating penalties
- Whitelist for trusted users
- Rate limiting on commands and API

**Rationale:** Multiple detection methods catch various spam patterns. Escalating penalties discourage repeat offenders while allowing mistakes.

# External Dependencies

## Third-Party Services

**WhatsApp API:** @whiskeysockets/baileys v6.6.0 - Core WhatsApp Web protocol implementation

**AI Services:**
- OpenAI API (optional) - GPT-3.5/4 for chat responses
- Google Generative AI SDK (optional) - Gemini models for AI features
- Requires API keys via environment variables

**Database:**
- MongoDB (optional) - Primary data store via Mongoose ODM
- Connection string via MONGODB_URL environment variable
- Bot remains functional without database (mock mode)

**Redis (optional):**
- Distributed caching for multi-instance deployments
- Connection via REDIS_URL environment variable

## Media Processing Libraries

**FFmpeg:** Required system dependency for video/audio processing
- Must be installed on host system
- Used via fluent-ffmpeg Node wrapper
- Commands: ytdl, video processing, audio manipulation

**Canvas:** Image manipulation library
- Native module compiled during npm install
- Used for: stickers, filters, image editing, QR codes

## Download Services

**ytdl-core:** YouTube video/audio downloads
**axios:** HTTP client for external APIs (Instagram, TikTok, etc.)
**Node-fetch:** Alternative HTTP client for specific services

## Utility Libraries

**Express.js v5:** Web server framework
**Mongoose v8:** MongoDB ODM
**Winston:** Logging framework
**Node-cron:** Task scheduler
**JWT (jsonwebtoken):** API authentication
**Bcrypt:** Password hashing
**Helmet:** HTTP security headers
**Express-rate-limit:** API rate limiting
**CORS:** Cross-origin resource sharing
**Compression:** Response compression middleware

## Development Tools

**dotenv:** Environment variable management
**fs-extra:** Enhanced filesystem operations
**lodash:** Utility functions
**moment:** Date/time manipulation
**chalk:** Terminal colors
**figlet:** ASCII art for startup banner

## Cloud Platform Detection

Bot automatically detects and adapts to:
- Replit (REPLIT_ENVIRONMENT variable)
- Railway (RAILWAY_ENVIRONMENT variable)
- Heroku (DYNO variable)
- Render (RENDER variable)
- Vercel (VERCEL variable)

**Session Management:** Supports file-based (local) and environment variable (cloud) session storage

**Port Binding:** Automatically uses PORT environment variable or defaults to 3000/5000