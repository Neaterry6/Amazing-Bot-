function getQuotedText(message) {
    const q = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!q) return '';
    return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '';
}

function extractMeta(code) {
    const name = code.match(/name\s*:\s*['"`]([^'"`]+)['"`]/)?.[1] || 'converted';
    const desc = code.match(/description\s*:\s*['"`]([^'"`]+)['"`]/)?.[1] || 'Converted command';
    const aliasesRaw = code.match(/aliases\s*:\s*\[([^\]]*)\]/)?.[1] || '';
    const aliases = aliasesRaw
        .split(',')
        .map((x) => x.trim().replace(/^['"`]|['"`]$/g, ''))
        .filter(Boolean);
    return { name, description: desc, aliases };
}

function indent(text, n = 2) {
    const pad = ' '.repeat(n);
    return text.split('\n').map((l) => `${pad}${l}`).join('\n');
}

function buildCase(code, meta) {
    return `case '${meta.name}': {\n${indent(code, 4)}\n  break;\n}`;
}

function buildMine(code, meta) {
    const aliases = meta.aliases.map((a) => `'${a}'`).join(', ');
    return `export default {\n  name: '${meta.name}',\n  aliases: [${aliases}],\n  category: 'utility',\n  description: '${meta.description.replace(/'/g, "\\'")}',\n  usage: '${meta.name}',\n  cooldown: 3,\n  supportsReply: true,\n  async execute({ sock, message, args, from, sender, prefix, isGroup, isGroupAdmin, isBotAdmin }) {\n${indent(code, 4)}\n  },\n  async onReply({ sock, message, replyText, from, sender }) {\n    return null;\n  }\n};`;
}

function buildPlugins(code, meta) {
    const aliases = [meta.name, ...meta.aliases].map((a) => `'${a}'`).join(', ');
    return `let handler = async (m, { conn, text, args, usedPrefix, command }) => {\n${indent(code, 2)}\n}\n\nhandler.help = ['${meta.name}']\nhandler.tags = ['utility']\nhandler.command = [${aliases}]\n\nexport default handler`;
}

export default {
    name: 'convert',
    aliases: ['cvt'],
    category: 'utility',
    description: 'Convert replied command code to case/mine/plugins while preserving metadata',
    usage: 'convert <case|mine|plugins> (reply to code)',
    cooldown: 3,
    minArgs: 1,

    async execute({ sock, message, args, from, prefix }) {
        const mode = (args[0] || '').toLowerCase();
        const source = getQuotedText(message);

        if (!source) {
            return sock.sendMessage(from, { text: `❌ Reply to command/code first.\nUsage: ${prefix}convert <case|mine|plugins>` }, { quoted: message });
        }

        const meta = extractMeta(source);
        let output = '';
        if (mode === 'case') output = buildCase(source, meta);
        else if (mode === 'mine') output = buildMine(source, meta);
        else if (mode === 'plugins') output = buildPlugins(source, meta);
        else return sock.sendMessage(from, { text: '❌ Use: case, mine, or plugins.' }, { quoted: message });

        return sock.sendMessage(from, {
            text: `✅ Converted *${meta.name}* to ${mode}.\n\n\`\`\`javascript\n${output}\n\`\`\``
        }, { quoted: message });
    }
};
