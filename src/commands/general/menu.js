import config from '../../config.js';



export default {
    name: 'menu',
    aliases: ['commands', 'list'],
    category: 'general',
    description: 'Interactive command menu with categories',
    usage: 'menu [category]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, prefix }) {
        const category = args[0]?.toLowerCase();
        
        if (category) {
            return this.showCategoryCommands(sock, from, category, prefix);
        }
        
        const menuText = `🎮 *${config.botName || 'WhatsApp Bot'} - Command Menu*

━━━━━━━━━━━━━━━━━━━━━

🎯 **COMMAND CATEGORIES** (128+ Commands)

🎮 **GAMES** (12 commands)
├ Interactive games and challenges
├ 🎲 akinator, blackjack, guess, hangman
├ 🧮 math, memory, riddle, rps, slots
╰ 🎯 tictactoe, trivia, word

🤖 **AI & SMART** (9 commands)
├ AI-powered features  
├ 🧠 chatgpt, gemini, analyze, ocr
├ 🗣️ stt, tts, translate
╰ 🎨 imagine

📥 **DOWNLOADERS** (10 commands)
├ Media downloaders from social platforms
├ 📱 tikdl, igdl, fbdl, twdl, pinterest
├ 🎵 youtube, ytmp3, ytmp4
╰ 📁 gdrive, mediafire

💰 **ECONOMY** (12 commands)
├ Virtual economy and gambling
├ 💳 balance, daily, weekly, work
├ 🛒 shop, buy, sell, inventory
╰ 🎰 gamble, rob, transfer

🎨 **MEDIA** (14 commands)
├ Image and video processing
├ 🖼️ sticker, blur, crop, resize, filter
├ 🎬 gif, merge, compress, watermark
╰ 🔄 toimg, toaudio, tovideo

🛡️ **ADMIN** (15 commands)
├ Group management and moderation
├ 👮 ban, kick, mute, warn, promote
├ 👥 tagall, hidetag, welcome
╰ ⚙️ antilink, setdesc, setname

👑 **OWNER** (18 commands)
├ Bot owner exclusive commands
├ 🔧 eval, exec, restart, shutdown
├ 📢 broadcast, join, leave
╰ 🎖️ addprem, delprem, backup

🔧 **UTILITY** (15 commands)
├ Developer and power user tools
├ 🔐 encrypt, decrypt, hash, base64
├ 📊 qr, uuid, password, poll
╰ 📝 note, todo, reminder

ℹ️ **GENERAL** (11 commands)
├ Information and utility functions
├ 📊 about, ping, help, info, stats
├ ⏰ time, uptime, weather
╰ 🧮 calc, search

━━━━━━━━━━━━━━━━━━━━━

💡 **How to explore:**
• \`${prefix}menu games\` - View games commands
• \`${prefix}menu ai\` - View AI commands  
• \`${prefix}help <command>\` - Get command details

🚀 **Quick start:**
• \`${prefix}ping\` - Test bot response
• \`${prefix}rps rock\` - Play rock-paper-scissors
• \`${prefix}calc 2+2\` - Calculator
• \`${prefix}weather London\` - Weather info

*✨ Type category name after menu to see specific commands! ✨*`;

        await sock.sendMessage(from, { text: menuText });
    },
    
    async showCategoryCommands(sock, from, category, prefix) {
        const categories = {
            games: {
                title: '🎮 GAMES COMMANDS',
                description: 'Interactive games and challenges',
                commands: [
                    { name: 'akinator', desc: 'Mind reading guessing game' },
                    { name: 'blackjack', desc: 'Play 21 card game against dealer' },
                    { name: 'guess', desc: 'Number guessing challenge' },
                    { name: 'hangman', desc: 'Word guessing with hangman' },
                    { name: 'math', desc: 'Mathematical challenges' },
                    { name: 'memory', desc: 'Sequence memory game' },
                    { name: 'riddle', desc: 'Brain teasing riddles' },
                    { name: 'rps', desc: 'Rock Paper Scissors' },
                    { name: 'slots', desc: 'Slot machine gambling' },
                    { name: 'tictactoe', desc: 'Tic-tac-toe against AI' },
                    { name: 'trivia', desc: 'Knowledge quiz challenges' },
                    { name: 'word', desc: 'Word games and puzzles' }
                ]
            },
            ai: {
                title: '🤖 AI & SMART COMMANDS', 
                description: 'AI-powered intelligent features',
                commands: [
                    { name: 'chatgpt', desc: 'Chat with AI assistant' },
                    { name: 'gemini', desc: 'Google Gemini AI' },
                    { name: 'analyze', desc: 'Analyze images with AI' },
                    { name: 'ocr', desc: 'Extract text from images' },
                    { name: 'stt', desc: 'Speech to text conversion' },
                    { name: 'tts', desc: 'Text to speech synthesis' },
                    { name: 'translate', desc: 'Multi-language translation' },
                    { name: 'imagine', desc: 'AI image generation' }
                ]
            },
            general: {
                title: 'ℹ️ GENERAL COMMANDS',
                description: 'Information and utility functions',
                commands: [
                    { name: 'about', desc: 'Bot information and stats' },
                    { name: 'calc', desc: 'Advanced calculator' },
                    { name: 'help', desc: 'Command help and usage' },
                    { name: 'info', desc: 'Bot details and version' },
                    { name: 'menu', desc: 'Interactive command menu' },
                    { name: 'ping', desc: 'Check bot response time' },
                    { name: 'search', desc: 'Search functionality' },
                    { name: 'stats', desc: 'Bot usage statistics' },
                    { name: 'time', desc: 'World clock and timezones' },
                    { name: 'uptime', desc: 'System uptime info' },
                    { name: 'weather', desc: 'Weather information' }
                ]
            },
            media: {
                title: '🎨 MEDIA COMMANDS',
                description: 'Image and video processing',
                commands: [
                    { name: 'sticker', desc: 'Create stickers from images' },
                    { name: 'blur', desc: 'Blur images' },
                    { name: 'crop', desc: 'Crop images to size' },
                    { name: 'resize', desc: 'Resize image dimensions' },
                    { name: 'filter', desc: 'Apply image filters' },
                    { name: 'watermark', desc: 'Add watermarks' },
                    { name: 'compress', desc: 'Compress file size' },
                    { name: 'gif', desc: 'Create GIF animations' },
                    { name: 'merge', desc: 'Merge multiple images' },
                    { name: 'toimg', desc: 'Convert to image format' },
                    { name: 'toaudio', desc: 'Extract/convert audio' },
                    { name: 'tovideo', desc: 'Convert to video format' }
                ]
            },
            utility: {
                title: '🔧 UTILITY COMMANDS',
                description: 'Developer and power user tools',
                commands: [
                    { name: 'base64', desc: 'Base64 encode/decode' },
                    { name: 'encrypt', desc: 'Encrypt sensitive text' },
                    { name: 'decrypt', desc: 'Decrypt encrypted text' },
                    { name: 'hash', desc: 'Generate hash values' },
                    { name: 'qr', desc: 'Generate QR codes' },
                    { name: 'uuid', desc: 'Generate unique IDs' },
                    { name: 'password', desc: 'Generate secure passwords' },
                    { name: 'color', desc: 'Color tools and conversion' },
                    { name: 'converter', desc: 'Unit conversions' },
                    { name: 'poll', desc: 'Create polls and surveys' },
                    { name: 'note', desc: 'Save and manage notes' },
                    { name: 'todo', desc: 'Todo list manager' },
                    { name: 'reminder', desc: 'Set reminders' }
                ]
            }
        };
        
        const cat = categories[category];
        if (!cat) {
            return sock.sendMessage(from, {
                text: `❌ *Unknown category "${category}"*\n\nValid categories: ${Object.keys(categories).join(', ')}`
            });
        }
        
        let commandList = `${cat.title}\n${cat.description}\n\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        cat.commands.forEach((cmd, index) => {
            commandList += `${index + 1}. \`${prefix}${cmd.name}\`\n   ${cmd.desc}\n\n`;
        });
        
        commandList += `━━━━━━━━━━━━━━━━━━━━━\n\n💡 Use \`${prefix}help <command>\` for detailed info\n📋 Total: ${cat.commands.length} commands in this category`;
        
        await sock.sendMessage(from, { text: commandList });
    }
};