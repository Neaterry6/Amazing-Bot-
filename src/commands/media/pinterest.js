import axios from 'axios';

function parseCount(raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1) return 1;
    return Math.min(n, 10);
}

export default {
    name: 'pinterest',
    aliases: ['pin'],
    category: 'media',
    description: 'Scrape Pinterest images by keyword',
    usage: 'pinterest <keyword> [count]',
    cooldown: 6,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const count = parseCount(args[args.length - 1]);
        const keyword = Number.isNaN(Number.parseInt(args[args.length - 1], 10))
            ? args.join(' ').trim()
            : args.slice(0, -1).join(' ').trim();

        if (!keyword) {
            return sock.sendMessage(from, { text: '❌ Usage: .pin <keyword> [count]\nExample: .pin cat 5' }, { quoted: message });
        }

        await sock.sendMessage(from, { text: `🔎 Searching Pinterest for "${keyword}" (${count} image${count > 1 ? 's' : ''})...` }, { quoted: message });

        try {
            const { data } = await axios.get(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`, {
                timeout: 45000,
                headers: {
                    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
                    accept: 'text/html'
                }
            });
            const html = String(data || '');
            const urls = [
                ...html.matchAll(/"url":"(https:\\\/\\\/i\.pinimg\.com\\\/[^"]+)"/g),
                ...html.matchAll(/https:\/\/i\.pinimg\.com\/[^\s"'\\]+/g)
            ].map((m) => String(m[1] || m[0] || '').replace(/\\\//g, '/'));
            const clean = [...new Set(urls)]
                .filter((url) => /^https?:\/\//.test(url) && /pinimg\.com/i.test(url))
                .slice(0, count);

            if (!clean.length) {
                return sock.sendMessage(from, { text: '❌ No Pinterest images found for that keyword.' }, { quoted: message });
            }

            for (let i = 0; i < clean.length; i += 1) {
                await sock.sendMessage(from, {
                    image: { url: clean[i] },
                    caption: `📌 Pinterest: ${keyword}\nImage ${i + 1}/${clean.length}`
                }, { quoted: message });
            }
        } catch (error) {
            return sock.sendMessage(from, { text: `❌ Pinterest fetch failed: ${error.message}` }, { quoted: message });
        }
    }
};
