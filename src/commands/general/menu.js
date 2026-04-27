import fs from 'fs';
import path from 'path';
import font from '../../utils/font.js';
import fetch from 'node-fetch';
import os from 'os';

const startTime = Date.now();

function getUptime() {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
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

function usageBar(used, total, size = 8) {
    const ratio = total > 0 ? Math.max(0, Math.min(1, used / total)) : 0;
    const fill = Math.round(ratio * size);
    return `[${'█'.repeat(fill)}${'░'.repeat(Math.max(0, size - fill))}] ${Math.round(ratio * 100)}%`;
}

async function getAllCommands() {
    const commandsPath = path.join(process.cwd(), 'src', 'commands');
    const categories = {};
    let totalCommands = 0;

    const scanDirectory = async (dir, category = '') => {
        const items = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                await scanDirectory(fullPath, item.name);
            } else if (item.name.endsWith('.js')) {
                try {
                    const command = await import('file://' + fullPath);
                    const cmd = command.default;

                    if (cmd && cmd.name) {
                        const cat = cmd.category || category || 'general';
                        
                        if (!categories[cat]) {
                            categories[cat] = [];
                        }

                        categories[cat].push({
                            name: cmd.name,
                            aliases: cmd.aliases || [],
                            description: cmd.description || 'No description',
                            usage: cmd.usage || cmd.name,
                            permissions: cmd.permissions || ['user'],
                            groupOnly: !!cmd.groupOnly
                        });

                        totalCommands++;
                    }
                } catch (e) {
                    console.error(`Failed to load ${fullPath}:`, e.message);
                }
            }
        }
    };

    try {
        await scanDirectory(commandsPath);
    } catch (e) {
        console.error('Failed to scan commands:', e);
    }

    return { categories, totalCommands };
}

const categoryEmojis = {
    owner: '👑',
    admin: '⚙️',
    media: '🎬',
    downloader: '📥',
    fun: '🎮',
    games: '🎯',
    tools: '🔧',
    entertainment: '🎭',
    general: '📂',
    utility: '🛠️'
};

export default {
    name: 'menu',
    aliases: ['m'],
    category: 'general',
    description: 'Display bot command menu',
    usage: 'menu [category]',
    example: 'menu\nmenu media',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender, prefix }) {
        const { categories, totalCommands } = await getAllCommands();

        if (args.length > 0) {
            const requestedCat = args[0].toLowerCase();
            const categoryCommands = categories[requestedCat];

            if (!categoryCommands) {
                return await sock.sendMessage(from, {
                    text: `❌ Category ${font.italic(requestedCat)} not found\n\nUse ${font.monospace(prefix + 'menu')} to see all categories`
                }, { quoted: message });
            }

            const emoji = categoryEmojis[requestedCat] || '📂';
            let msg = `┏❐ 《 *${emoji} ${requestedCat.toUpperCase()} MENU* 》 ❐\n`;
            const sorted = [...categoryCommands].sort((a, b) => String(a.name).localeCompare(String(b.name)));
            sorted.forEach((cmd) => {
                const scope = cmd.groupOnly ? ' [GROUP]' : '';
                msg += `┣◆ ${prefix}${cmd.name}${scope}\n`;
            });
            const groupOnlyCount = sorted.filter((c) => c.groupOnly).length;
            msg += `┗❐\n\n`;
            msg += `*Total:* ${sorted.length} command(s)\n`;
            msg += `*Group-only:* ${groupOnlyCount}\n`;
            msg += `*Tip:* ${prefix}help <command> for usage details`;

            return await sock.sendMessage(from, { text: msg }, { quoted: message });
        }

        const botName = process.env.BOT_NAME || 'WhatsApp Bot';
        const ownerNumber = process.env.OWNER_NUMBER || 'Unknown';

        const ramUsed = process.memoryUsage().rss;
        const ramTotal = os.totalmem();

        let menuText = `┏❐  *◈ ${botName.toUpperCase()} MENU ◈*\n`;
        menuText += `┃ *owner* : ${ownerNumber}\n`;
        menuText += `┃ *mode* : ${process.env.BOT_MODE || 'public'}\n`;
        menuText += `┃ *prefix* : [ ${prefix} ]\n`;
        menuText += `┃ *uptime* : ${getUptime()}\n`;
        menuText += `┃ *commands* : ${totalCommands}\n`;
        menuText += `┃ *usage* : ${formatBytes(ramUsed)} of ${formatBytes(ramTotal)}\n`;
        menuText += `┃ *ram* : ${usageBar(ramUsed, ramTotal)}\n`;
        menuText += `┗❐\n\n`;
        menuText += `┏❐ 《 *CATEGORY MENU* 》 ❐\n`;

        const sortedCategories = Object.keys(categories).sort();

        sortedCategories.forEach((cat) => {
            const emoji = categoryEmojis[cat] || '📂';
            const count = categories[cat].length;
            const groupOnlyCount = categories[cat].filter((c) => c.groupOnly).length;
            menuText += `┣◆ ${emoji} ${cat} (${count}) [groups: ${groupOnlyCount}]\n`;
        });
        menuText += `┗❐\n`;
        menuText += `\n[GROUP] means command works only in groups.\n`;
        menuText += `Reply with category name or use ${prefix}menu <category>\n`;
        menuText += `Example: ${prefix}menu ai`;

        let sentMsg;
        try {
            const apiResponse = await fetch('https://api.waifu.pics/sfw/waifu', { timeout: 5000 });
            const apiData = await apiResponse.json();
            sentMsg = await sock.sendMessage(from, {
                image: { url: apiData.url },
                caption: menuText
            }, { quoted: message });
        } catch {
            sentMsg = await sock.sendMessage(from, { text: menuText }, { quoted: message });
        }

        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }

        global.replyHandlers[sentMsg.key.id] = {
            command: 'menu',
            handler: async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                if (replySender !== sender) return;

                const requestedCat = replyText.trim().toLowerCase();
                const categoryCommands = categories[requestedCat];

                if (!categoryCommands) return;

                delete global.replyHandlers[sentMsg.key.id];

                const emoji = categoryEmojis[requestedCat] || '📂';
                let msg = `┏❐ 《 *${emoji} ${requestedCat.toUpperCase()} MENU* 》 ❐\n`;
                const sorted = [...categoryCommands].sort((a, b) => String(a.name).localeCompare(String(b.name)));
                sorted.forEach((cmd) => {
                    const scope = cmd.groupOnly ? ' [GROUP]' : '';
                    msg += `┣◆ ${prefix}${cmd.name}${scope}\n`;
                });
                msg += `┗❐`;

                await sock.sendMessage(from, { text: msg }, { quoted: replyMessage });
            }
        };
    }
};
