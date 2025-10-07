# Overview

Ilom WhatsApp Bot is a comprehensive Node.js application built using the Baileys library for WhatsApp automation. The bot features AI integration (OpenAI GPT and Google Gemini), extensive media processing capabilities, a modular command system with 120+ commands across 10 categories, economy/gaming systems, and administrative tools. It's designed for deployment across multiple cloud platforms (Replit, Railway, Heroku, Render, Vercel, Koyeb) with flexible database support.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **WhatsApp Integration**: Built on @whiskeysockets/baileys v6.6.0+ for WhatsApp Web API communication
- **Node.js Runtime**: v20+ using ES6 modules with async/await patterns throughout
- **Express Web Server**: RESTful API on port 3000-5000 for bot management, health checks, and webhook endpoints
- **Modular Plugin System**: Hot-reloadable plugins for features like anti-spam, auto-reply, welcome messages, and chat bot functionality

## Command System Architecture
- **Category-based Organization**: Commands organized in folders by category (admin, ai, downloader, economy, fun, games, general, media, owner, utility)
- **Dynamic Command Loading**: Automatic discovery and registration from filesystem via commandHandler
- **Permission Layers**: Multi-level access control (owner, admin, premium, user, banned) with role-based command execution
- **Alias Support**: Multiple command triggers and shortcuts per command
- **Built-in Protections**: Rate limiting, cooldown system, anti-spam detection, and abuse prevention

## Data Management
- **Flexible Database Support**: MongoDB via Mongoose ODM with graceful fallback when database unavailable
- **Session Persistence**: WhatsApp authentication state stored in cache/auth_info_baileys directory
- **In-Memory Caching**: NodeCache for high-performance data retrieval with optional Redis support
- **File Storage**: Local filesystem for media, temporary files, logs, and backups

## AI and Media Processing
- **Multi-AI Support**: Integrated OpenAI GPT and Google Gemini APIs for conversational AI and content generation
- **Media Processing Stack**: FFmpeg for audio/video manipulation, Canvas for image processing and generation
- **Download Services**: Support for YouTube (ytdl-core), Instagram, TikTok, Facebook, Twitter via axios-based downloaders
- **Media Utilities**: Audio/video conversion, image manipulation, sticker creation, and document processing

## Security and Performance
- **Anti-Spam System**: Pattern detection for repeated messages, caps lock abuse, excessive mentions, and URL spam
- **Rate Limiting**: Per-user request throttling with configurable windows (messages, commands, media, API calls)
- **Authentication**: JWT-based API authentication with bcrypt password hashing
- **Input Validation**: Comprehensive validation utilities using express-validator for all user inputs
- **Error Handling**: Centralized error management with file logging, retry mechanisms, and graceful degradation

## Deployment and Environment
- **Cloud Platform Detection**: Automatic detection and configuration for Replit, Railway, Heroku, Render, Vercel, Netlify, Koyeb
- **Session Management**: Support for SESSION_ID environment variable and multiple session formats
- **Zero-Database Mode**: Fully functional operation without MongoDB connection
- **Web Dashboard**: Health monitoring, stats tracking, and bot management interface
- **PM2 Support**: Process management configuration with auto-restart and log rotation

# External Dependencies

## Core Services
- **WhatsApp**: @whiskeysockets/baileys v6.6.0 for WhatsApp Web protocol
- **Database**: MongoDB Atlas (optional) via Mongoose ODM for persistent storage
- **Cache**: Redis (optional) for distributed caching and session management

## AI Providers
- **OpenAI**: GPT models for conversational AI and text generation (API key required)
- **Google Gemini**: Alternative AI provider for content generation (API key required)

## Media Processing
- **FFmpeg**: Command-line tool for audio/video encoding, conversion, and streaming
- **Canvas**: Node-canvas for server-side image generation and manipulation
- **Music Metadata**: Audio file metadata extraction and parsing

## Download Services
- **ytdl-core**: YouTube video/audio downloading
- **Axios**: HTTP client for Instagram, TikTok, Facebook, Twitter, and other platform integrations
- **MegaJS**: MEGA.nz file storage integration for large file handling

## Utilities and Tools
- **Express Middleware**: helmet (security), compression (response compression), morgan (HTTP logging), cors (cross-origin), express-rate-limit
- **Authentication**: passport, passport-jwt, passport-local, jsonwebtoken, bcryptjs
- **File Management**: fs-extra, archiver (compression), multer (file uploads)
- **Task Scheduling**: node-cron for scheduled tasks and automated cleanup
- **Logging**: winston for structured logging with file rotation
- **Validation**: express-validator for request validation and sanitization