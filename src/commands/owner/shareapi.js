import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, out);
        else if (entry.isFile() && /\.js$/i.test(entry.name)) out.push(p);
    }
    return out;
}

function collectApis() {
    const files = walk(path.join(process.cwd(), 'src', 'commands'));
    const map = new Map();
    for (const file of files) {
        const txt = fs.readFileSync(file, 'utf8');
        const urls = [...txt.matchAll(/https?:\/\/[^\s'"`]+/g)].map((m) => m[0]);
        for (const u of urls) {
            if (!map.has(u)) map.set(u, []);
            map.get(u).push(path.relative(process.cwd(), file));
        }
    }
    return [...map.entries()].map(([url, usedIn]) => ({ url, usedIn }));
}

export default {
    name: 'shareapi',
    aliases: ['apis', 'allapi', 'apiindex'],
    category: 'owner',
    description: 'List APIs used in commands and reply with number to send selected API',
    usage: 'shareapi',
    ownerOnly: true,
    permissions: ['owner'],
    cooldown: 2,

    async execute({ sock, message, from }) {
        const list = collectApis();
        if (!list.length) return sock.sendMessage(from, { text: 'No API URLs found in command files.' }, { quoted: message });

        const text = ['📡 *APIs found in command files*', '', ...list.slice(0, 80).map((x, i) => `${i + 1}. ${x.url}`), '', 'Reply with a number to get API details.'].join('\n');
        const sent = await sock.sendMessage(from, { text }, { quoted: message });

        if (!global.replyHandlers) global.replyHandlers = {};
        global.replyHandlers[sent.key.id] = {
            command: 'shareapi',
            handler: async (replyText, replyMessage) => {
                const n = Number.parseInt(String(replyText || '').trim(), 10);
                if (Number.isNaN(n) || n < 1 || n > list.length) {
                    return sock.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: replyMessage });
                }
                const picked = list[n - 1];
                return sock.sendMessage(from, {
                    text: `✅ API #${n}\n\nURL: ${picked.url}\n\nUsed in:\n${picked.usedIn.map((f) => `- ${f}`).join('\n')}`
                }, { quoted: replyMessage });
            }
        };
    }
};
