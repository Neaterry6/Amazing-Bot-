import config from '../../config.js';
import { getUser } from '../../models/User.js';
import moment from 'moment';
import fetch from 'node-fetch';
import os from 'os';

const bootTime = Date.now();

function formatUptime(ms) {
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function formatBytes(bytes = 0) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = Number(bytes) || 0;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i += 1;
    }
    return `${value.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

function usageBar(used, total, size = 10) {
    const ratio = total > 0 ? Math.max(0, Math.min(1, used / total)) : 0;
    const fill = Math.round(ratio * size);
    return `[${'█'.repeat(fill)}${'░'.repeat(Math.max(0, size - fill))}] ${Math.round(ratio * 100)}%`;
}

export default {
    name: 'help',
    aliases: ['h', 'commands'],
    category: 'general',
    description: 'Get a list of all commands or info about a specific command',
    usage: 'help [command]',
    example: 'help\nhelp ping',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const { getAllCommands, getAllCategories, getCommandsByCategory, getCommand } = await import('../../utils/commandManager.js');
            
            const userData = await getUser(sender) || {
                name: 'Warrior',
                isPremium: false,
                xp: 0,
                economy: { balance: 0 }
            };
            
            const pushName = message.pushName || userData.name || 'Warrior';
            const userId = sender.split('@')[0];
            const userLevel = Math.floor((userData.xp ?? 0) / 1000) + 1;
            const userStatus = userData.isPremium ? '⚡ PREMIUM ELITE' : '🌟 FREE SAIYAN';
            const userPower = userData.isPremium ? '♾️ UNLIMITED ACCESS' : '⚔️ BASE FORM';
            const userCredits = userData.isPremium ? '∞ INFINITE' : `${userData.economy?.balance ?? 0} ZENI`;
            
            if (args.length > 0) {
                return this.showCommandDetails({ sock, message, from, commandName: args[0], prefix, sender, getCommand });
            }
            
            const allCommands = getAllCommands();
            const categories = getAllCategories();
            const totalCommands = allCommands.length;
            
            const now = moment();
            const currentDate = now.format('DD/MM/YYYY');
            const currentDay = now.format('dddd');
            const currentTime = now.format('hh:mm:ss A');
            const speedStart = process.hrtime.bigint();
            const speedEnd = process.hrtime.bigint();
            const speedMs = Number(speedEnd - speedStart) / 1_000_000;
            const ramUsed = process.memoryUsage().rss;
            const ramTotal = os.totalmem();
            const uptime = formatUptime(Date.now() - bootTime);
            
            const categoryMap = {
                'admin': '🛡️', 'ai': '🤖', 'downloader': '📥', 'economy': '💰',
                'fun': '🎭', 'games': '🎮', 'general': '📱', 'media': '🎨',
                'owner': '👑', 'utility': '🔧', 'moderation': '⚖️', 'music': '🎵',
                'social': '👥', 'info': '📊', 'misc': '⭐', 'search': '🔍',
                'anime': '🌸', 'tools': '🛠️', 'image': '🖼️', 'system': '⚙️', 'rank': '🏆'
            };

            let helpMessage = `┏❐  *◈ ${String(config.botName || 'AMAZING BOT').toUpperCase()} ◈*\n`;
            helpMessage += `┃ *user* : ${pushName}\n`;
            helpMessage += `┃ *id* : @${userId}\n`;
            helpMessage += `┃ *owner* : ${config.ownerName || 'Unknown'}\n`;
            helpMessage += `┃ *mode* : ${config.publicMode === false ? 'self' : 'public'}\n`;
            helpMessage += `┃ *speed* : ${speedMs.toFixed(3)} Ms\n`;
            helpMessage += `┃ *prefix* : [ ${prefix} ]\n`;
            helpMessage += `┃ *uptime* : ${uptime}\n`;
            helpMessage += `┃ *version* : ${config.botVersion || '1.0.0'}\n`;
            helpMessage += `┃ *usage* : ${formatBytes(ramUsed)} of ${formatBytes(ramTotal)}\n`;
            helpMessage += `┃ *ram* : ${usageBar(ramUsed, ramTotal)}\n`;
            helpMessage += `┃ *status* : ${userStatus}\n`;
            helpMessage += `┃ *power* : ${userPower}\n`;
            helpMessage += `┃ *credits* : ${userCredits}\n`;
            helpMessage += `┃ *date* : ${currentDate} (${currentDay})\n`;
            helpMessage += `┃ *time* : ${currentTime}\n`;
            helpMessage += `┗❐\n`;

            for (const category of categories.sort()) {
                const commands = getCommandsByCategory(category);
                if (commands.length === 0) continue;
                
                const emoji = categoryMap[category.toLowerCase()] || '⭐';

                helpMessage += `\n┏❐ 《 *${emoji} ${category.toUpperCase()} MENU* 》 ❐\n`;
                for (const cmd of commands.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
                    helpMessage += `┣◆ ${prefix}${cmd.name}\n`;
                }
                helpMessage += `┗❐\n`;
            }

            helpMessage += `\n*Total Commands:* ${totalCommands}\n`;
            helpMessage += `*Usage:* ${prefix}help <command>\n`;
            helpMessage += `*Category Menu:* ${prefix}menu <category>\n`;
            helpMessage += `*Support:* ${prefix}support`;

            try {
                const apiResponse = await fetch('https://api.waifu.pics/sfw/waifu', { timeout: 5000 });
                const apiData = await apiResponse.json();
                const imgUrl = apiData.url;
                
                await sock.sendMessage(from, {
                    image: { url: imgUrl },
                    caption: helpMessage,
                    mentions: [sender]
                }, { quoted: message });
            } catch (error) {
                await sock.sendMessage(from, {
                    text: helpMessage,
                    mentions: [sender]
                }, { quoted: message });
            }
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Error loading help menu: ${error.message}`
            }, { quoted: message });
        }
    },

    async showCommandDetails({ sock, message, from, commandName, prefix, sender, getCommand }) {
        const cmd = getCommand(commandName);
        
        if (!cmd) {
            return sock.sendMessage(from, {
                text: `╭──⦿【 ❌ COMMAND ERROR 】\n│ Command "${commandName}" not found\n│ Use ${prefix}help to see all commands\n╰────────⦿`
            }, { quoted: message });
        }

        let info = `╭──⦿【 📋 COMMAND DETAILS 】\n`;
        info += `│ 🏷️ 𝗡𝗮𝗺𝗲: ${cmd.name}\n`;
        info += `│ 🔄 𝗔𝗹𝗶𝗮𝘀𝗲𝘀: ${cmd.aliases && cmd.aliases.length ? cmd.aliases.join(', ') : 'None'}\n`;
        info += `│ 📖 𝗨𝘀𝗮𝗴𝗲: ${prefix}${cmd.usage || cmd.name}\n`;
        info += `│ 📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻: ${cmd.description || 'No description provided'}\n`;
        info += `│ 📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${cmd.category || 'Uncategorized'}\n`;
        info += `│ ⏱️ 𝗖𝗼𝗼𝗹𝗱𝗼𝘄𝗻: ${cmd.cooldown || 0}s\n`;
        info += `│ 🔒 𝗣𝗲𝗿𝗺𝗶𝘀𝘀𝗶𝗼𝗻𝘀: ${(cmd.permissions || ['user']).join(', ')}\n`;
        info += `│ 💎 𝗣𝗿𝗲𝗺𝗶𝘂𝗺: ${cmd.premium ? 'Yes' : 'No'}\n`;
        info += `│ 👑 𝗢𝘄𝗻𝗲𝗿 𝗢𝗻𝗹𝘆: ${cmd.ownerOnly ? 'Yes' : 'No'}\n`;
        info += `╰────────⦿\n`;
        info += `╭─────────────⦿\n`;
        info += `│💫 | [ ${config.botName} 🍀 ] - Command Analysis\n`;
        info += `╰────────────⦿`;
        
        return sock.sendMessage(from, {
            text: info,
            mentions: [sender]
        }, { quoted: message });
    }
};
