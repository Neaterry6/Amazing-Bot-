import config from '../../config.js';
import { commandHandler } from '../../handlers/commandHandler.js';
import { getUser } from '../../models/User.js';
import moment from 'moment';
import fetch from 'node-fetch';

export default {
    name: 'help',
    aliases: ['h', 'menu', 'commands'],
    category: 'utility',
    description: 'Display bot commands and features with stylish design',
    usage: 'help [command]',
    cooldown: 3,
    permissions: ['user'],
    supportsButtons: true,
    supportsReply: true,

    async execute({ sock, message, args, from, prefix, sender }) {
        const user = await getUser(sender);
        
        if (args.length > 0) {
            return this.showCommandDetails({ sock, message, from, commandName: args[0], prefix, user });
        }
        
        const categories = commandHandler.getAllCategories();
        const totalCommands = commandHandler.getCommandCount();
        
        const now = moment();
        const day = now.format('dddd');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('hh:mm:ss A') + ' UTC';
        
        const userStatus = user.isPremium ? 'PREMIUM ELITE' : 'FREE USER';
        const userPower = user.isPremium ? 'UNLIMITED ACCESS' : 'LIMITED ACCESS';
        const userCredits = user.isPremium ? '∞ INFINITE' : user.economy?.balance || 0;
        const userName = user.name || 'User';
        const userId = sender.split('@')[0];
        
        const thumbnail = await this.getRandomAnimeImage();
        
        const categoryMap = {
            'admin': { emoji: '🛡️', title: 'ADMIN' },
            'ai': { emoji: '🤖', title: 'AI' },
            'downloader': { emoji: '📥', title: 'DOWNLOADER' },
            'economy': { emoji: '💰', title: 'ECONOMY' },
            'fun': { emoji: '🎭', title: 'FUN' },
            'games': { emoji: '🎮', title: 'GAMES' },
            'general': { emoji: '📱', title: 'GENERAL' },
            'media': { emoji: '📱', title: 'MEDIA' },
            'owner': { emoji: '👑', title: 'OWNER' },
            'utility': { emoji: '🔧', title: 'UTILITY' }
        };
        
        let helpText = `╭──⦿【 ⚡ ${config.botName.toUpperCase()} 】
│ 🎯 𝗨𝘀𝗲𝗿: ${userName}
│ 🔰 𝗜𝗗: @${userId}
│ 👑 𝗦𝘁𝗮𝘁𝘂𝘀: ${userStatus}
│ ⚡ 𝗣𝗼𝘄𝗲𝗿: ${userPower}
│ 💎 𝗖𝗿𝗲𝗱𝗶𝘁𝘀: ${userCredits}
│ 🌐 𝗣𝗿𝗲𝗳𝗶𝘅: ${prefix}
│ 🤖 𝗦𝘆𝘀𝘁𝗲𝗺: ${config.botName} v${config.botVersion}
│ 👨‍💻 𝗖𝗿𝗲𝗮𝘁𝗼𝗿: ${config.ownerName}
│ 🔄 𝗦𝘁𝗮𝘁𝘂𝘀: ONLINE & ACTIVE
│ 📅 𝗗𝗮𝘁𝗲: ${date}
│ 📆 𝗗𝗮𝘆: ${day}
│ ⏰ 𝗧𝗶𝗺𝗲: ${time}
╰────────⦿

`;

        for (const category of categories.sort()) {
            const commands = commandHandler.getCommandsByCategory(category);
            if (commands.length === 0) continue;
            
            const categoryInfo = categoryMap[category] || { emoji: '⭐', title: category.toUpperCase() };
            
            helpText += `╭──⦿【 ${categoryInfo.emoji} 𝗖𝗠𝗗 - ${categoryInfo.title} 】\n`;
            
            const commandList = commands.map(cmd => `✧${cmd.name}`).join(' ');
            const words = commandList.split(' ');
            let currentLine = '│';
            
            for (const word of words) {
                if ((currentLine + ' ' + word).length > 60) {
                    helpText += currentLine + '\n';
                    currentLine = '│' + word;
                } else {
                    currentLine += (currentLine === '│' ? '' : ' ') + word;
                }
            }
            
            if (currentLine !== '│') {
                helpText += currentLine + '\n';
            }
            
            helpText += '╰────────⦿\n\n';
        }
        
        helpText += `╭──────────⦿
│ 𝗧𝗼𝘁𝗮𝗹 𝗰𝗺𝗱𝘀:「${totalCommands}」
│ 𝗧𝘆𝗽𝗲: [ ${prefix}𝚑𝚎𝚕𝚙 <𝚌𝚖𝚍> ]
│ 𝘁𝗼 𝗹𝗲𝗮𝗿𝗻 𝘁𝗵𝗲 𝘂𝘀𝗮𝗴𝗲.
│ 𝗧𝘆𝗽𝗲: [ ${prefix}𝚜𝘂𝚙𝚙𝚘𝚛𝚝 ] to join
│ Support Group
╰─────────────⦿
╭─────────────⦿
│💫 | [ ${config.botName} 🍀 ]
╰────────────⦿`;

        const buttons = [
            { buttonId: `${prefix}owner`, buttonText: { displayText: '👨‍💻 Owner' }, type: 1 },
            { buttonId: `${prefix}support`, buttonText: { displayText: '🆘 Support' }, type: 1 },
            { buttonId: `${prefix}stats`, buttonText: { displayText: '📊 Stats' }, type: 1 }
        ];

        try {
            await sock.sendMessage(from, {
                image: { url: thumbnail },
                caption: helpText,
                footer: `© ${config.botName} - Powered by ${config.ownerName}`,
                buttons: buttons,
                headerType: 4
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: helpText,
                contextInfo: {
                    externalAdReply: {
                        title: `${config.botName} - Help Menu`,
                        body: `Total Commands: ${totalCommands}`,
                        thumbnailUrl: thumbnail,
                        sourceUrl: config.botRepository,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
        }
    },

    async showCommandDetails({ sock, message, from, commandName, prefix, user }) {
        const command = commandHandler.getCommand(commandName);
        
        if (!command) {
            return sock.sendMessage(from, {
                text: `❌ Command "${commandName}" not found.\n\n💡 Use ${prefix}help to see all commands.`
            }, { quoted: message });
        }
        
        const categoryInfo = {
            'admin': '🛡️',
            'ai': '🤖',
            'downloader': '📥',
            'economy': '💰',
            'fun': '🎭',
            'games': '🎮',
            'general': '📱',
            'media': '📱',
            'owner': '👑',
            'utility': '🔧'
        };
        
        const categoryEmoji = categoryInfo[command.category] || '⭐';
        const thumbnail = await this.getRandomAnimeImage();
        
        const helpText = `╭──⦿【 ${categoryEmoji} ${command.name.toUpperCase()} 】
│
│ 📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:
│ ${command.description || 'No description available'}
│
│ 🏷️ 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${command.category.toUpperCase()}
│
│ 📖 𝗨𝘀𝗮𝗴𝗲:
│ ${prefix}${command.usage || command.name}
│
│ ⏱️ 𝗖𝗼𝗼𝗹𝗱𝗼𝘄𝗻: ${command.cooldown || 0} seconds
│
│ 👥 𝗣𝗲𝗿𝗺𝗶𝘀𝘀𝗶𝗼𝗻𝘀: ${(command.permissions || ['user']).join(', ')}
${command.aliases && command.aliases.length > 0 ? `│\n│ 🔗 𝗔𝗹𝗶𝗮𝘀𝗲𝘀:\n│ ${command.aliases.map(a => `${prefix}${a}`).join(', ')}` : ''}
│
╰────────────⦿

💡 𝗧𝗶𝗽: Reply to this message with your question about this command!`;
        
        const sentMsg = await sock.sendMessage(from, {
            text: helpText,
            contextInfo: {
                externalAdReply: {
                    title: `${command.name.toUpperCase()} Command`,
                    body: command.description,
                    thumbnailUrl: thumbnail,
                    sourceUrl: config.botRepository,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });
        
        if (command.supportsReply && sentMsg) {
            this.setupReplyHandler(sock, from, sentMsg.key.id, command, prefix);
        }
        
        return sentMsg;
    },

    setupReplyHandler(sock, from, messageId, command, prefix) {
        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers) {
                delete global.replyHandlers[messageId];
            }
        }, 300000);
        
        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }
        
        global.replyHandlers[messageId] = {
            command: command.name,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const response = `╭──⦿【 💬 AUTO RESPONSE 】
│
│ Command: ${command.name}
│ Question: ${replyText}
│
│ 📖 Answer:
│ For detailed usage of ${prefix}${command.name}, 
│ please type: ${prefix}${command.usage || command.name}
│
│ If you need more help, contact the owner
│ using ${prefix}owner command.
│
╰────────────⦿`;
                
                await sock.sendMessage(from, {
                    text: response,
                    mentions: [replyMessage.participant || replyMessage.key.participant]
                }, { quoted: replyMessage });
                
                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
            }
        };
    },

    async getRandomAnimeImage() {
        const animeApis = [
            'https://api.waifu.pics/sfw/waifu',
            'https://api.waifu.pics/sfw/neko',
            'https://nekos.best/api/v2/neko',
            'https://nekos.best/api/v2/waifu',
            'https://api.nekosapi.com/v3/images/random?rating=safe&limit=1'
        ];
        
        try {
            const randomApi = animeApis[Math.floor(Math.random() * animeApis.length)];
            const response = await fetch(randomApi);
            const data = await response.json();
            
            if (randomApi.includes('waifu.pics')) {
                return data.url || config.botThumbnail || 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            } else if (randomApi.includes('nekos.best')) {
                return data.results?.[0]?.url || config.botThumbnail || 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            } else if (randomApi.includes('nekosapi')) {
                return data.items?.[0]?.image_url || config.botThumbnail || 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            }
        } catch (error) {
            console.error('Error fetching anime image:', error);
        }
        
        return config.botThumbnail || 'https://i.ibb.co/2M7rtLk/ilom.jpg';
    }
};
