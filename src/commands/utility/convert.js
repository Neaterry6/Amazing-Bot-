function getQuotedText(message) {
    const q = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!q) return '';
    return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '';
}

function indentBlock(code, spaces) {
    const pad = ' '.repeat(spaces);
    return code.split('\n').map((line) => `${pad}${line}`).join('\n');
}

function toCaseTemplate(code) {
    return `switch (command) {\n  case 'newcmd': {\n${indentBlock(code, 4)}\n    break;\n  }\n}`;
}

function toMineTemplate(code) {
    return `export default {\n  name: 'newcmd',\n  aliases: [],\n  category: 'utility',\n  description: 'Converted command',\n  usage: 'newcmd',\n  cooldown: 3,\n  async execute({ sock, message, args, from }) {\n${indentBlock(code, 4)}\n  }\n};`;
}

function toPluginsTemplate(code) {
    return `let handler = async (m, { args, usedPrefix, command }) => {\n${indentBlock(code, 2)}\n}\n\nhandler.help = ['newcmd']\nhandler.tags = ['tools']\nhandler.command = ['newcmd']\n\nexport default handler`;
}

export default {
    name: 'convert',
    aliases: ['cvt'],
    category: 'utility',
    description: 'Convert replied command code to case/mine/plugins structure',
    usage: 'convert <case|mine|plugins> (reply to code)',
    cooldown: 3,
    minArgs: 1,

    async execute({ sock, message, args, from, prefix }) {
        const mode = (args[0] || '').toLowerCase();
        const source = getQuotedText(message);

        if (!source) {
            return sock.sendMessage(from, { text: `❌ Reply to a command/code message first.\nUsage: ${prefix}convert <case|mine|plugins>` }, { quoted: message });
        }

        let output;
        if (mode === 'case') output = toCaseTemplate(source);
        else if (mode === 'mine') output = toMineTemplate(source);
        else if (mode === 'plugins') output = toPluginsTemplate(source);
        else {
            return sock.sendMessage(from, { text: `❌ Unknown mode: ${mode}\nUse: case, mine, or plugins.` }, { quoted: message });
        }

        await sock.sendMessage(from, {
            text: `✅ Converted to *${mode}* style:\n\n\`\`\`javascript\n${output}\n\`\`\``
        }, { quoted: message });
    }
};
