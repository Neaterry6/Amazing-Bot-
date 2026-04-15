import axios from 'axios';

export default {
    name: 'dns',
    aliases: ['dnslookup', 'subdns'],
    category: 'utility',
    description: 'Lookup DNS records and known host entries for a domain',
    usage: 'dns <domain>',
    cooldown: 3,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const domain = args.join(' ').trim().toLowerCase();
        if (!domain) {
            return sock.sendMessage(from, { text: '❌ Provide a domain. Example: .dns google.com' }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '📡', key: message.key } });

        try {
            const [dnsRes, subRes] = await Promise.all([
                axios.get(`https://api.hackertarget.com/dnslookup/?q=${encodeURIComponent(domain)}`, { timeout: 45000 }),
                axios.get(`https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(domain)}`, { timeout: 45000 })
            ]);

            const dnsLines = String(dnsRes.data || '').trim().split('\n').filter(Boolean).slice(0, 8);
            const subLines = String(subRes.data || '').trim().split('\n').filter(Boolean).slice(0, 12);

            const report = [
                `🌐 *Domain:* ${domain}`,
                '',
                '🔍 *DNS Records:*',
                '```',
                ...(dnsLines.length ? dnsLines : ['No DNS records returned.']),
                '```',
                '',
                '🛰️ *Host/Subdomain Results:*',
                '```',
                ...(subLines.length ? subLines : ['No host/subdomain results returned.']),
                '```'
            ].join('\n');

            await sock.sendMessage(from, { text: report }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ DNS lookup failed. Try again later.' }, { quoted: message });
        }
    }
};
