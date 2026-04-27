import { setAntiHijackConfig, getAntiHijackConfig } from '../../utils/antihijackStore.js';

function normalizeJid(raw = '') {
    return String(raw || '').split(':')[0];
}

export default {
    name: 'antihijack',
    aliases: ['ahijack'],
    category: 'admin',
    description: 'Auto-kick users sending hijack/bug/crashgc words and protect admin structure',
    usage: 'antihijack <on|off|status>',
    cooldown: 3,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender }) {
        const action = String(args[0] || 'status').toLowerCase();
        if (!['on', 'off', 'status'].includes(action)) {
            return sock.sendMessage(from, { text: '❌ Usage: antihijack <on|off|status>' }, { quoted: message });
        }

        if (action === 'status') {
            const conf = await getAntiHijackConfig(from);
            return sock.sendMessage(from, {
                text: `🛡️ AntiHijack is *${conf.enabled ? 'ON' : 'OFF'}*\nOwner lock: ${conf.ownerJid || 'not set'}`
            }, { quoted: message });
        }

        if (action === 'off') {
            await setAntiHijackConfig(from, false, '');
            return sock.sendMessage(from, { text: '✅ AntiHijack turned OFF.' }, { quoted: message });
        }

        const cleanSender = normalizeJid(sender);
        await setAntiHijackConfig(from, true, cleanSender);

        return sock.sendMessage(from, {
            text: [
                '✅ AntiHijack turned ON.',
                'Now watching for: hijacked, bug, crashgc.',
                'Offenders will be kicked automatically.'
            ].join('\n')
        }, { quoted: message });
    }
};
