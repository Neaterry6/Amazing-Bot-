import fs from 'fs';
import path from 'path';

const CODE_CHUNK_SIZE = 3400;
const COMMAND_CATEGORIES = ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'];

function normalizeInputPath(input = '') {
    return String(input || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');
}

function isSafeRelativePath(filePath = '') {
    if (!filePath) return false;
    if (filePath.includes('\0')) return false;
    if (filePath.split('/').includes('..')) return false;
    return true;
}

function splitCodeBlock(content, language = 'javascript') {
    const out = [];
    for (let i = 0; i < content.length; i += CODE_CHUNK_SIZE) {
        out.push(content.slice(i, i + CODE_CHUNK_SIZE));
    }
    return out.map((chunk, index) => `\`\`\`${language}\n${chunk}\n\`\`\`\nPart ${index + 1}/${out.length}`);
}

export default {
    name: 'plugins',
    aliases: ['pluginfile', 'plug'],
    category: 'owner',
    description: 'Fetch and send command files as chat code blocks.',
    usage: 'plugins get <category/file.js>',
    example: 'plugins get media/togcstatus.js',
    cooldown: 1,
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, prefix }) {
        const action = String(args[0] || '').toLowerCase();
        const commandsRoot = path.join(process.cwd(), 'src', 'commands');

        if (!action || action === 'help') {
            return await sock.sendMessage(from, {
                text:
                    `📦 *PLUGINS COMMAND*\n\n` +
                    `• ${prefix}plugins get media/togcstatus.js\n` +
                    `• ${prefix}plugins list\n\n` +
                    `No channel/newsletter links are attached.`
            }, { quoted: message });
        }

        if (action === 'list' || action === 'ls') {
            return await sock.sendMessage(from, {
                text: `📁 Available categories:\n${COMMAND_CATEGORIES.map(c => `• ${c}`).join('\n')}`
            }, { quoted: message });
        }

        if (action !== 'get' && action !== 'fetch') {
            return await sock.sendMessage(from, {
                text: `❌ Unknown action.\nUse: ${prefix}plugins get <category/file.js>`
            }, { quoted: message });
        }

        const relPath = normalizeInputPath(args[1] || '');
        if (!isSafeRelativePath(relPath) || !relPath.includes('/')) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid path.\nExample: ${prefix}plugins get media/togcstatus.js`
            }, { quoted: message });
        }

        const [category] = relPath.split('/');
        if (!COMMAND_CATEGORIES.includes(category)) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid category "${category}".`
            }, { quoted: message });
        }

        const targetPath = path.join(commandsRoot, relPath);
        const resolvedTarget = path.resolve(targetPath);
        const resolvedRoot = path.resolve(commandsRoot) + path.sep;
        if (!resolvedTarget.startsWith(resolvedRoot)) {
            return await sock.sendMessage(from, { text: '❌ Path escaped commands directory.' }, { quoted: message });
        }

        if (!fs.existsSync(resolvedTarget)) {
            return await sock.sendMessage(from, {
                text: `❌ File not found: ${relPath}`
            }, { quoted: message });
        }

        const content = fs.readFileSync(resolvedTarget, 'utf8');
        const parts = splitCodeBlock(content, 'javascript');

        await sock.sendMessage(from, {
            text: `📄 *${relPath}*\nLines: ${content.split('\n').length}\nSize: ${Buffer.byteLength(content, 'utf8')} bytes`
        }, { quoted: message });

        for (const part of parts) {
            await sock.sendMessage(from, { text: part }, { quoted: message });
        }
    }
};
