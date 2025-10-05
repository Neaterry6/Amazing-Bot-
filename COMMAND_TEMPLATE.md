# 🎯 ILOM BOT - Command Creation Guide

## 📋 Table of Contents
- [Basic Command Structure](#basic-command-structure)
- [Command Properties](#command-properties)
- [Advanced Features](#advanced-features)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## 🚀 Basic Command Structure

Every command must follow this structure:

```javascript
export default {
    name: 'commandname',
    aliases: ['alias1', 'alias2'],
    category: 'general',
    description: 'Brief description of what this command does',
    usage: 'commandname [arguments]',
    example: 'commandname hello world',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 10,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        await sock.sendMessage(from, {
            text: 'Your response here'
        }, { quoted: message });
    }
};
```

---

## 📝 Command Properties

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | String | Unique command identifier (lowercase, no spaces) |
| `execute` | Function | Main function that runs when command is called |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `aliases` | Array | `[]` | Alternative names for the command |
| `category` | String | `'general'` | Command category (admin, ai, downloader, economy, fun, games, general, media, owner, utility) |
| `description` | String | `''` | Brief explanation of command functionality |
| `usage` | String | `name` | How to use the command |
| `example` | String | `name` | Example usage |
| `cooldown` | Number | `0` | Seconds before user can use command again |
| `permissions` | Array | `['user']` | Required permissions (user, admin, owner, premium, group, private, botAdmin) |
| `args` | Boolean | `false` | Whether command requires arguments |
| `minArgs` | Number | `0` | Minimum number of arguments required |
| `maxArgs` | Number | `Infinity` | Maximum number of arguments allowed |
| `typing` | Boolean | `true` | Show typing indicator when executing |
| `premium` | Boolean | `false` | Only premium users can use |
| `hidden` | Boolean | `false` | Hide from help menu |
| `ownerOnly` | Boolean | `false` | Only bot owner can use |
| `supportsReply` | Boolean | `false` | Enable reply handler |
| `supportsChat` | Boolean | `false` | Enable chat context |
| `supportsReact` | Boolean | `false` | Enable reaction handler |
| `supportsButtons` | Boolean | `false` | Command can send buttons |

---

## 🎨 Advanced Features

### 1. Quoted Messages (REQUIRED)

**ALL COMMANDS MUST USE QUOTED MESSAGES:**

```javascript
await sock.sendMessage(from, {
    text: 'Your response'
}, { quoted: message });
```

### 2. Reply Handler (supportsReply: true)

Allow users to reply to command output for follow-up interactions:

```javascript
export default {
    name: 'quiz',
    supportsReply: true,
    
    async execute({ sock, message, from, sender }) {
        const sentMsg = await sock.sendMessage(from, {
            text: '❓ What is 2 + 2?\n\n💡 Reply to this message with your answer!'
        }, { quoted: message });
        
        if (sentMsg) {
            this.setupReplyHandler(sock, from, sentMsg.key.id, sender);
        }
    },
    
    setupReplyHandler(sock, from, messageId, sender) {
        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers) {
                delete global.replyHandlers[messageId];
            }
        }, 60000);
        
        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }
        
        global.replyHandlers[messageId] = {
            command: this.name,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const answer = replyText.trim();
                const isCorrect = answer === '4';
                
                await sock.sendMessage(from, {
                    text: isCorrect ? '✅ Correct!' : '❌ Wrong! The answer is 4',
                    mentions: [sender]
                }, { quoted: replyMessage });
                
                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
            }
        };
    }
};
```

### 3. Chat Context Handler (supportsChat: true)

Maintain conversation context for multi-turn interactions:

```javascript
export default {
    name: 'story',
    supportsChat: true,
    
    async execute({ sock, message, from, sender }) {
        this.setupChatHandler(sock, from, sender);
        
        await sock.sendMessage(from, {
            text: '📖 Story Mode Activated!\n\nTell me a genre (fantasy, sci-fi, horror):'
        }, { quoted: message });
    },
    
    setupChatHandler(sock, from, sender) {
        const chatTimeout = setTimeout(() => {
            if (global.chatHandlers) {
                delete global.chatHandlers[sender];
            }
        }, 300000);
        
        if (!global.chatHandlers) {
            global.chatHandlers = {};
        }
        
        global.chatHandlers[sender] = {
            command: this.name,
            step: 'genre',
            data: {},
            timeout: chatTimeout,
            handler: async (text, message) => {
                const handler = global.chatHandlers[sender];
                
                if (handler.step === 'genre') {
                    handler.data.genre = text;
                    handler.step = 'character';
                    await sock.sendMessage(from, {
                        text: `Great! ${text} story it is! Now give me a character name:`
                    }, { quoted: message });
                } else if (handler.step === 'character') {
                    handler.data.character = text;
                    
                    await sock.sendMessage(from, {
                        text: `📚 Story:\n\nOnce upon a time, ${handler.data.character} lived in a ${handler.data.genre} world...`
                    }, { quoted: message });
                    
                    clearTimeout(chatTimeout);
                    delete global.chatHandlers[sender];
                }
            }
        };
    }
};
```

### 4. Button Support (supportsButtons: true)

Send interactive buttons with your command:

```javascript
export default {
    name: 'settings',
    supportsButtons: true,
    
    async execute({ sock, message, from, prefix }) {
        const buttons = [
            { buttonId: `${prefix}settings language`, buttonText: { displayText: '🌐 Language' }, type: 1 },
            { buttonId: `${prefix}settings theme`, buttonText: { displayText: '🎨 Theme' }, type: 1 },
            { buttonId: `${prefix}settings notifications`, buttonText: { displayText: '🔔 Notifications' }, type: 1 }
        ];
        
        await sock.sendMessage(from, {
            text: '⚙️ Bot Settings\n\nChoose a setting to configure:',
            footer: '© Ilom Bot',
            buttons: buttons,
            headerType: 1
        }, { quoted: message });
    }
};
```

---

## 📚 Complete Examples

### Example 1: Simple Command (WITH QUOTED MESSAGE)

```javascript
export default {
    name: 'ping',
    aliases: ['p', 'test'],
    category: 'general',
    description: 'Check bot response time',
    usage: 'ping',
    cooldown: 3,
    permissions: ['user'],
    
    async execute({ sock, message, from }) {
        const start = Date.now();
        
        await sock.sendMessage(from, {
            text: `🏓 Pong! Response time: ${Date.now() - start}ms`
        }, { quoted: message });
    }
};
```

### Example 2: Command with Arguments (WITH QUOTED MESSAGE)

```javascript
export default {
    name: 'calculator',
    aliases: ['calc', 'math'],
    category: 'utility',
    description: 'Perform mathematical calculations',
    usage: 'calc <expression>',
    example: 'calc 2 + 2',
    cooldown: 2,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    
    async execute({ sock, message, from, args }) {
        try {
            const expression = args.join(' ');
            const result = eval(expression);
            
            await sock.sendMessage(from, {
                text: `🧮 Calculation:\n\n${expression} = ${result}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Invalid mathematical expression!'
            }, { quoted: message });
        }
    }
};
```

### Example 3: Admin Command (WITH QUOTED MESSAGE)

```javascript
export default {
    name: 'ban',
    aliases: ['kick'],
    category: 'admin',
    description: 'Ban a user from the group',
    usage: 'ban @user',
    cooldown: 5,
    permissions: ['admin', 'botAdmin'],
    minArgs: 1,
    
    async execute({ sock, message, from, isGroup, isGroupAdmin, isBotAdmin, sender }) {
        if (!isGroup) {
            return sock.sendMessage(from, {
                text: '❌ This command can only be used in groups!'
            }, { quoted: message });
        }
        
        if (!isGroupAdmin) {
            return sock.sendMessage(from, {
                text: '❌ You need to be a group admin to use this command!'
            }, { quoted: message });
        }
        
        if (!isBotAdmin) {
            return sock.sendMessage(from, {
                text: '❌ Bot needs to be admin to ban users!'
            }, { quoted: message });
        }
        
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        
        if (!mentioned) {
            return sock.sendMessage(from, {
                text: '❌ Please mention a user to ban!'
            }, { quoted: message });
        }
        
        await sock.groupParticipantsUpdate(from, [mentioned], 'remove');
        
        await sock.sendMessage(from, {
            text: `✅ User banned successfully!`,
            mentions: [mentioned, sender]
        }, { quoted: message });
    }
};
```

### Example 4: Owner Command (CMD)

```javascript
export default {
    name: 'cmd',
    aliases: ['exec', 'shell'],
    category: 'owner',
    description: 'Execute shell commands or install packages',
    usage: 'cmd <command|install|get> [args]',
    example: 'cmd ls -la',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    minArgs: 1,
    
    async execute({ sock, message, from, args }) {
        const action = args[0];
        
        if (action === 'install') {
            const packageName = args.slice(1).join(' ');
            
            await sock.sendMessage(from, {
                text: `📦 Installing: ${packageName}\n⏳ Please wait...`
            }, { quoted: message });
            
        }
    }
};
```

---

## ✅ Best Practices

1. **Quoted Messages**: ALWAYS use `{ quoted: message }` when sending messages
2. **Error Handling**: Always wrap your code in try-catch blocks
3. **User Feedback**: Provide clear success/error messages
4. **Performance**: Use async/await properly and avoid blocking operations
5. **Security**: Validate all user inputs before processing
6. **Permissions**: Check permissions before executing sensitive operations
7. **Cooldowns**: Set appropriate cooldowns to prevent spam
8. **Documentation**: Write clear descriptions and usage examples
9. **Testing**: Test commands in both group and private chats
10. **Cleanup**: Clear timeouts and handlers when done
11. **Mentions**: Use mentions for user-specific responses
12. **No Comments**: Never add comments to code unless explicitly requested

---

## 🗂️ File Structure

Save your command file in the appropriate category folder:

```
src/commands/
├── admin/         - Group management commands
├── ai/            - AI-powered features
├── downloader/    - Media downloaders
├── economy/       - Virtual economy
├── fun/           - Entertainment commands
├── games/         - Interactive games
├── general/       - General utility commands
├── media/         - Media processing
├── owner/         - Owner-only commands
└── utility/       - Developer tools
```

---

## 🔥 Quick Start Template

```javascript
export default {
    name: 'mycommand',
    aliases: [],
    category: 'general',
    description: 'My awesome command',
    usage: 'mycommand',
    cooldown: 3,
    permissions: ['user'],
    
    async execute({ sock, message, from, args, sender }) {
        await sock.sendMessage(from, {
            text: 'Hello from my command!'
        }, { quoted: message });
    }
};
```

---

## 🔑 Key Updates

1. **ALL commands MUST use quoted messages** - `{ quoted: message }`
2. **Owner recognition** - Bot recognizes owner from .env even in groups
3. **No auto-reply** - Bot only responds to commands with prefix
4. **Better fonts** - Use stylish Unicode fonts for better appearance
5. **Advanced cmd command** - Execute shell commands, install packages, get files
6. **Canvas uptime** - Beautiful image-based uptime display

---

**Created with ❤️ by Ilom**
**Ilom Bot v1.0.0**
