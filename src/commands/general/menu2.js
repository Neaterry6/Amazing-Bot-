import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

async function getCommandsByCategory() {
    const root = path.join(process.cwd(), 'src', 'commands');
    const buckets = {};

    async function scan(dir, fallback = 'general') {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await scan(full, entry.name);
                continue;
            }
            if (!entry.name.endsWith('.js')) continue;
            try {
                const mod = await import(`file://${full}`);
                const cmd = mod?.default;
                if (!cmd?.name) continue;
                const cat = String(cmd.category || fallback || 'general').toLowerCase();
                if (!buckets[cat]) buckets[cat] = [];
                buckets[cat].push(cmd.name);
            } catch {}
        }
    }

    await scan(root);
    for (const cat of Object.keys(buckets)) {
        buckets[cat] = [...new Set(buckets[cat])].sort((a, b) => a.localeCompare(b));
    }
    return buckets;
}

function buildMenu(prefix, categories) {
    const fixed = [
        'allmenu', 'aimenu', 'animemenu', 'bugmenu', 'downloadmenu', 'funmenu',
        'gamemenu', 'groupmenu', 'logomenu', 'ownermenu', 'stickermenu',
        'toolsmenu', 'voicemenu', 'othermenu'
    ];

    let text = '━◆ *Λ𝗫𝗜𝗦 𝗫𝗠𝗗 - 𝐌𝐄𝐍𝐔 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐄𝐒* ◆━━┓\n';
    for (const item of fixed) text += `│❖ ${prefix}${item}\n`;
    text += '┗━━━━━━━━━━━━━━━━━━━━━\n\n';

    text += '╭──〔 *ALL COMMANDS BY CATEGORY* 〕──\n';
    for (const cat of Object.keys(categories).sort()) {
        const list = categories[cat];
        text += `│\n│ *${cat.toUpperCase()}* (${list.length})\n`;
        text += `│ ${list.map((c) => `${prefix}${c}`).join(' | ')}\n`;
    }
    text += '╰────────────────────────';
    return text;
}

export default {
    name: 'menu2',
    aliases: ['categoriesmenu', 'catmenu2'],
    category: 'general',
    description: 'Beautiful categories + full command list menu',
    usage: 'menu2',
    cooldown: 3,

    async execute({ sock, message, from, prefix }) {
        const categories = await getCommandsByCategory();
        const caption = buildMenu(prefix, categories);

        try {
            const response = await fetch('https://api.waifu.pics/sfw/waifu', { timeout: 10000 });
            const data = await response.json();
            if (data?.url) {
                return sock.sendMessage(from, { image: { url: data.url }, caption }, { quoted: message });
            }
        } catch {}

        return sock.sendMessage(from, { text: caption }, { quoted: message });
    }
};
