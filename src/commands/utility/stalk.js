import axios from 'axios';

const ENDPOINTS = {
    tiktok: q => `https://apiskeith.top/stalker/tiktok?user=${encodeURIComponent(q)}`,
    ig: q => `https://apiskeith.top/stalker/ig?user=${encodeURIComponent(q)}`,
    twitter: q => `https://apiskeith.top/stalker/twitter?user=${encodeURIComponent(q)}`,
    ytchannel: q => `https://apiskeith.top/stalker/ytchannel?user=${encodeURIComponent(q)}`,
    wachannel: q => `https://apiskeith.top/stalker/wachannel2?url=${encodeURIComponent(q)}`,
    country: q => `https://apiskeith.top/stalker/country?region=${encodeURIComponent(q)}`,
    pinterest: q => `https://apiskeith.top/stalker/pinterest?q=${encodeURIComponent(q)}`,
    githubtrend: q => `https://apiskeith.top/stalker/githubtrend?language=${encodeURIComponent(q)}&since=weekly`
};

export default {
    name: 'stalk',
    aliases: ['stalker'],
    category: 'utility',
    description: 'Stalker lookups (tiktok/ig/twitter/ytchannel/etc)',
    usage: 'stalk <type> <query>',
    args: true,
    minArgs: 2,

    async execute({ sock, message, args, from }) {
        try {
            const type = (args[0] || '').toLowerCase();
            const query = args.slice(1).join(' ').trim();
            const fn = ENDPOINTS[type];
            if (!fn) {
                return await sock.sendMessage(from, { text: `❌ Types: ${Object.keys(ENDPOINTS).join(', ')}` }, { quoted: message });
            }

            const { data } = await axios.get(fn(query), { timeout: 30000 });
            const result = data?.result ?? data?.data ?? data;
            await sock.sendMessage(from, {
                text: `🕵️ *${type} stalk result*\n\n${JSON.stringify(result, null, 2).slice(0, 3500)}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Stalk failed: ${error.message}` }, { quoted: message });
        }
    }
};
