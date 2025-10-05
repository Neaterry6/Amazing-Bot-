import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'cmd',
    aliases: ['command', 'cmds', 'plugin'],
    category: 'owner',
    description: 'Advanced command management system - install, get, find, delete, list, and reload commands',
    usage: 'cmd <action> [options]',
    example: 'cmd list\ncmd find ping\ncmd get general/ping.js\ncmd install https://example.com/command.js general\ncmd upload general\ncmd delete ping\ncmd reload ping',
    cooldown: 2,
    permissions: ['owner'],
    args: true,
    minArgs: 1,
    maxArgs: 10,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: true,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        const action = args[0].toLowerCase();
        const commandsDir = path.join(process.cwd(), 'src', 'commands');
        
        const categories = ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'];

        try {
            switch (action) {
                case 'list':
                case 'ls': {
                    const category = args[1]?.toLowerCase();
                    let result = '╭──⦿【 📋 COMMAND LIST 】\n';
                    
                    if (category && categories.includes(category)) {
                        const categoryPath = path.join(commandsDir, category);
                        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                        result += `│ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${category}\n`;
                        result += `│ 📊 𝗧𝗼𝘁𝗮𝗹: ${files.length} commands\n`;
                        result += `│\n`;
                        files.forEach((file, i) => {
                            result += `│ ${i + 1}. ${file.replace('.js', '')}\n`;
                        });
                    } else {
                        let totalCommands = 0;
                        for (const cat of categories) {
                            const categoryPath = path.join(commandsDir, cat);
                            if (fs.existsSync(categoryPath)) {
                                const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                                totalCommands += files.length;
                                result += `│ 📁 ${cat.padEnd(12)}: ${files.length} commands\n`;
                            }
                        }
                        result += `│\n│ 📊 𝗧𝗼𝘁𝗮𝗹: ${totalCommands} commands\n`;
                    }
                    
                    result += '╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿';
                    
                    await sock.sendMessage(from, { text: result }, { quoted: message });
                    break;
                }

                case 'find':
                case 'search': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Command name required\n│\n│ 💡 𝗨𝘀𝗮𝗴𝗲: cmd find <name>\n╰────────⦿'
                        }, { quoted: message });
                        return;
                    }

                    const searchTerm = args[1].toLowerCase();
                    const results = [];

                    for (const category of categories) {
                        const categoryPath = path.join(commandsDir, category);
                        if (fs.existsSync(categoryPath)) {
                            const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                            for (const file of files) {
                                if (file.toLowerCase().includes(searchTerm)) {
                                    results.push({
                                        category,
                                        file,
                                        path: path.join(category, file)
                                    });
                                }
                            }
                        }
                    }

                    if (results.length === 0) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 🔍 SEARCH RESULTS 】\n│ 🔎 𝗤𝘂𝗲𝗿𝘆: ${searchTerm}\n│ 📊 𝗙𝗼𝘂𝗻𝗱: 0 commands\n│\n│ ❌ No matches found\n╰────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    let resultText = `╭──⦿【 🔍 SEARCH RESULTS 】\n│ 🔎 𝗤𝘂𝗲𝗿𝘆: ${searchTerm}\n│ 📊 𝗙𝗼𝘂𝗻𝗱: ${results.length} commands\n│\n`;
                    results.forEach((r, i) => {
                        resultText += `│ ${i + 1}. ${r.file.replace('.js', '')}\n│    📁 ${r.category}\n│    📄 ${r.path}\n│\n`;
                    });
                    resultText += '╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿';

                    await sock.sendMessage(from, { text: resultText }, { quoted: message });
                    break;
                }

                case 'get':
                case 'show':
                case 'view':
                case 'download': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Command path required\n│\n│ 💡 𝗨𝘀𝗮𝗴𝗲: cmd get <category/file>\n│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: cmd get general/ping.js\n╰────────⦿'
                        }, { quoted: message });
                        return;
                    }

                    const cmdPath = args[1].replace(/\\/g, '/');
                    const fullPath = path.join(commandsDir, cmdPath);

                    if (!fs.existsSync(fullPath)) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: File not found\n│\n│ 📂 𝗣𝗮𝘁𝗵: ${cmdPath}\n╰────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const content = fs.readFileSync(fullPath, 'utf8');
                    const fileName = path.basename(cmdPath);
                    const fileSize = (content.length / 1024).toFixed(2);
                    const lines = content.split('\n').length;

                    await sock.sendMessage(from, {
                        document: Buffer.from(content, 'utf8'),
                        mimetype: 'text/javascript',
                        fileName: fileName,
                        caption: `╭──⦿【 📄 COMMAND FILE 】\n│ 📁 𝗙𝗶𝗹𝗲: ${fileName}\n│ 📂 𝗣𝗮𝘁𝗵: ${cmdPath}\n│ 💾 𝗦𝗶𝘇𝗲: ${fileSize} KB\n│ 📝 𝗟𝗶𝗻𝗲𝘀: ${lines}\n╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿`
                    }, { quoted: message });
                    break;
                }

                case 'install':
                case 'add': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: URL or path required\n│\n│ 💡 𝗨𝘀𝗮𝗴𝗲: cmd install <url> [category]\n│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: cmd install https://url.com/cmd.js general\n╰────────⦿'
                        }, { quoted: message });
                        return;
                    }

                    const source = args[1];
                    const targetCategory = args[2]?.toLowerCase() || 'general';

                    if (!categories.includes(targetCategory)) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Invalid category\n│\n│ 📁 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲:\n${categories.map(c => `│    • ${c}`).join('\n')}\n╰────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    let content;
                    let fileName;

                    if (source.startsWith('http://') || source.startsWith('https://')) {
                        try {
                            const response = await axios.get(source);
                            content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
                            fileName = path.basename(new URL(source).pathname);
                            if (!fileName.endsWith('.js')) fileName += '.js';
                        } catch (error) {
                            await sock.sendMessage(from, {
                                text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Download failed\n│\n│ 🔗 𝗨𝗥𝗟: ${source}\n│ ⚠️ 𝗘𝗿𝗿𝗼𝗿: ${error.message}\n╰────────⦿`
                            }, { quoted: message });
                            return;
                        }
                    } else {
                        if (!fs.existsSync(source)) {
                            await sock.sendMessage(from, {
                                text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: File not found\n│\n│ 📂 𝗣𝗮𝘁𝗵: ${source}\n╰────────⦿`
                            }, { quoted: message });
                            return;
                        }
                        content = fs.readFileSync(source, 'utf8');
                        fileName = path.basename(source);
                    }

                    const targetPath = path.join(commandsDir, targetCategory, fileName);

                    if (fs.existsSync(targetPath)) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ⚠️ WARNING 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: File already exists\n│\n│ 📄 𝗙𝗶𝗹𝗲: ${fileName}\n│ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${targetCategory}\n│\n│ 💡 Delete it first or rename\n╰────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    fs.writeFileSync(targetPath, content);

                    const fileSize = (content.length / 1024).toFixed(2);

                    await sock.sendMessage(from, {
                        text: `╭──⦿【 ✅ INSTALLED 】\n│ 📄 𝗙𝗶𝗹𝗲: ${fileName}\n│ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${targetCategory}\n│ 📂 𝗣𝗮𝘁𝗵: ${targetCategory}/${fileName}\n│ 💾 𝗦𝗶𝘇𝗲: ${fileSize} KB\n╰────────⦿\n\n╭──⦿【 ⚡ STATUS 】\n│ 🔄 Restart bot to load\n╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿`
                    }, { quoted: message });
                    break;
                }

                case 'upload':
                case 'attach': {
                    const targetCategory = args[1]?.toLowerCase() || 'general';

                    if (!categories.includes(targetCategory)) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Invalid category\n│\n│ 📁 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲:\n${categories.map(c => `│    • ${c}`).join('\n')}\n╰────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    const documentMsg = quotedMsg?.documentMessage;

                    if (!documentMsg) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 💡 UPLOAD GUIDE 】\n│ 𝗛𝗼𝘄 𝘁𝗼 𝘂𝘀𝗲:\n│\n│ 1. Send your .js file\n│ 2. Reply to it with:\n│    ${prefix}cmd upload [category]\n│\n│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲:\n│    ${prefix}cmd upload general\n│    ${prefix}cmd upload fun\n╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const fileName = documentMsg.fileName;
                    
                    if (!fileName.endsWith('.js')) {
                        await sock.sendMessage(from, {
                            text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Invalid file type\n│\n│ 📄 𝗥𝗲𝗾𝘂𝗶𝗿𝗲𝗱: .js file\n╰────────⦿'
                        }, { quoted: message });
                        return;
                    }

                    const targetPath = path.join(commandsDir, targetCategory, fileName);

                    if (fs.existsSync(targetPath)) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ⚠️ WARNING 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: File already exists\n│\n│ 📄 𝗙𝗶𝗹𝗲: ${fileName}\n│ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${targetCategory}\n│\n│ 💡 Delete it first or rename\n╰────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    try {
                        const stream = await sock.downloadMediaMessage(message.message.extendedTextMessage.contextInfo.quotedMessage);
                        const buffers = [];
                        for await (const chunk of stream) {
                            buffers.push(chunk);
                        }
                        const buffer = Buffer.concat(buffers);
                        
                        fs.writeFileSync(targetPath, buffer);

                        const fileSize = (buffer.length / 1024).toFixed(2);

                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ✅ UPLOADED 】\n│ 📄 𝗙𝗶𝗹𝗲: ${fileName}\n│ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${targetCategory}\n│ 📂 𝗣𝗮𝘁𝗵: ${targetCategory}/${fileName}\n│ 💾 𝗦𝗶𝘇𝗲: ${fileSize} KB\n╰────────⦿\n\n╭──⦿【 ⚡ STATUS 】\n│ 🔄 Restart bot to load\n╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿`
                        }, { quoted: message });
                    } catch (error) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Upload failed\n│\n│ ⚠️ 𝗘𝗿𝗿𝗼𝗿: ${error.message}\n╰────────⦿`
                        }, { quoted: message });
                    }
                    break;
                }

                case 'delete':
                case 'remove':
                case 'rm': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Command path required\n│\n│ 💡 𝗨𝘀𝗮𝗴𝗲: cmd delete <category/file>\n│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: cmd delete general/test.js\n╰────────⦿'
                        }, { quoted: message });
                        return;
                    }

                    const cmdPath = args[1].replace(/\\/g, '/');
                    const fullPath = path.join(commandsDir, cmdPath);

                    if (!fs.existsSync(fullPath)) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: File not found\n│\n│ 📂 𝗣𝗮𝘁𝗵: ${cmdPath}\n╰────────⦿`
                        }, { quoted: message });
                        return;
                    }

                    const fileName = path.basename(cmdPath);
                    fs.unlinkSync(fullPath);

                    await sock.sendMessage(from, {
                        text: `╭──⦿【 🗑️ DELETED 】\n│ 📄 𝗙𝗶𝗹𝗲: ${fileName}\n│ 📂 𝗣𝗮𝘁𝗵: ${cmdPath}\n╰────────⦿\n\n╭──⦿【 ⚡ STATUS 】\n│ 🔄 Restart bot to apply\n╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿`
                    }, { quoted: message });
                    break;
                }

                case 'reload':
                case 'refresh': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Command name required\n│\n│ 💡 𝗨𝘀𝗮𝗴𝗲: cmd reload <name>\n│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: cmd reload ping\n╰────────⦿'
                        }, { quoted: message });
                        return;
                    }

                    const cmdName = args[1].toLowerCase();
                    let found = false;

                    for (const category of categories) {
                        const categoryPath = path.join(commandsDir, category);
                        if (!fs.existsSync(categoryPath)) continue;
                        
                        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                        for (const file of files) {
                            const filePath = path.join(categoryPath, file);
                            try {
                                const module = await import(`file://${filePath}?update=${Date.now()}`);
                                if (module.default.name === cmdName || module.default.aliases?.includes(cmdName)) {
                                    found = true;
                                    await sock.sendMessage(from, {
                                        text: `╭──⦿【 🔄 RELOADED 】\n│ 📄 𝗖𝗼𝗺𝗺𝗮𝗻𝗱: ${cmdName}\n│ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${category}\n│ 📂 𝗙𝗶𝗹𝗲: ${file}\n╰────────⦿\n\n╭──⦿【 ⚡ STATUS 】\n│ ✨ Ready to use!\n╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿`
                                    }, { quoted: message });
                                    return;
                                }
                            } catch (error) {
                                continue;
                            }
                        }
                    }

                    if (!found) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Command not found\n│\n│ 🔍 𝗡𝗮𝗺𝗲: ${cmdName}\n╰────────⦿`
                        }, { quoted: message });
                    }
                    break;
                }

                case 'info':
                case 'details': {
                    if (!args[1]) {
                        await sock.sendMessage(from, {
                            text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Command name required\n│\n│ 💡 𝗨𝘀𝗮𝗴𝗲: cmd info <name>\n│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: cmd info ping\n╰────────⦿'
                        }, { quoted: message });
                        return;
                    }

                    const cmdName = args[1].toLowerCase();
                    let found = false;

                    for (const category of categories) {
                        const categoryPath = path.join(commandsDir, category);
                        if (!fs.existsSync(categoryPath)) continue;
                        
                        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
                        for (const file of files) {
                            const filePath = path.join(categoryPath, file);
                            try {
                                const module = await import(`file://${filePath}?update=${Date.now()}`);
                                const cmd = module.default;
                                
                                if (cmd.name === cmdName || cmd.aliases?.includes(cmdName)) {
                                    found = true;
                                    let info = `╭──⦿【 ℹ️ COMMAND INFO 】\n`;
                                    info += `│ 📝 𝗡𝗮𝗺𝗲: ${cmd.name}\n`;
                                    info += `│ 🏷️ 𝗔𝗹𝗶𝗮𝘀𝗲𝘀: ${cmd.aliases?.join(', ') || 'None'}\n`;
                                    info += `│ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${category}\n`;
                                    info += `│ 📄 𝗙𝗶𝗹𝗲: ${file}\n`;
                                    info += `│ 📖 𝗗𝗲𝘀𝗰: ${cmd.description || 'No description'}\n`;
                                    info += `│ 💡 𝗨𝘀𝗮𝗴𝗲: ${prefix}${cmd.usage || cmd.name}\n`;
                                    info += `│ ⏱️ 𝗖𝗼𝗼𝗹𝗱𝗼𝘄𝗻: ${cmd.cooldown || 0}s\n`;
                                    info += `│ 🔒 𝗣𝗲𝗿𝗺𝗶𝘀𝘀𝗶𝗼𝗻𝘀: ${cmd.permissions?.join(', ') || 'All'}\n`;
                                    info += `│ 💎 𝗣𝗿𝗲𝗺𝗶𝘂𝗺: ${cmd.premium ? 'Yes' : 'No'}\n`;
                                    info += `│ 👁️ 𝗛𝗶𝗱𝗱𝗲𝗻: ${cmd.hidden ? 'Yes' : 'No'}\n`;
                                    if (cmd.example) {
                                        info += `│\n│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲:\n${cmd.example.split('\n').map(line => `│    ${line}`).join('\n')}\n`;
                                    }
                                    info += '╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿';

                                    await sock.sendMessage(from, { text: info }, { quoted: message });
                                    return;
                                }
                            } catch (error) {
                                continue;
                            }
                        }
                    }

                    if (!found) {
                        await sock.sendMessage(from, {
                            text: `╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Command not found\n│\n│ 🔍 𝗡𝗮𝗺𝗲: ${cmdName}\n╰────────⦿`
                        }, { quoted: message });
                    }
                    break;
                }

                default: {
                    const helpText = `╭──⦿【 🛠️ CMD MANAGEMENT 】\n│\n│ 📋 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗔𝗰𝘁𝗶𝗼𝗻𝘀:\n│\n│ 📂 list [category] - List commands\n│ 🔍 find <name> - Search commands\n│ 📥 get <path> - Download command\n│ 📦 install <url> [category] - Install from URL\n│ 📤 upload [category] - Upload from file\n│ 🗑️ delete <path> - Remove command\n│ 🔄 reload <name> - Reload command\n│ ℹ️ info <name> - Show details\n│\n│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:\n│ • ${prefix}cmd list fun\n│ • ${prefix}cmd find ping\n│ • ${prefix}cmd get general/ping.js\n│ • ${prefix}cmd info help\n│ • ${prefix}cmd reload menu\n│\n╰────────⦿\n\n╭─────────────⦿\n│💫 | [ Ilom Bot 🍀 ]\n╰────────────⦿`;
                    
                    await sock.sendMessage(from, { text: helpText }, { quoted: message });
                    break;
                }
            }

        } catch (error) {
            console.error('CMD command error:', error);
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ SYSTEM ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: ${error.message}\n│\n│ ⚠️ Command system error\n│ 🔄 Please try again\n╰────────⦿`
            }, { quoted: message });
        }
    }
};