const CHECKS = ['smartcheck', 'greatcheckcase', 'stupidcheck', 'uncleancheck', 'hotcheck', 'gaycheck', 'waifucheck', 'evilcheck', 'dogcheck', 'coolcheck'];

function getBody(message) {
    return message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || message?.message?.imageMessage?.caption
        || message?.message?.videoMessage?.caption
        || '';
}

function getInvoked(message, prefix, fallback) {
    const body = getBody(message).trim();
    if (!body || !body.startsWith(prefix)) return fallback;
    return body.slice(prefix.length).split(/\s+/)[0].toLowerCase() || fallback;
}

export default {
    name: 'smartcheck',
    aliases: CHECKS.filter(c => c !== 'smartcheck'),
    category: 'fun',
    description: 'Random percent fun checks',
    usage: 'smartcheck',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, prefix }) {
        const invoked = getInvoked(message, prefix, 'smartcheck');
        const selected = CHECKS.includes(invoked) ? invoked : 'smartcheck';
        const percent = Math.floor(Math.random() * 101);
        const user = message.key.participant || message.key.remoteJid;
        const label = selected.replace('check', '');

        await sock.sendMessage(from, {
            text: `*${selected.toUpperCase()}*\n@${user.split('@')[0]} is ${percent}% ${label}`,
            mentions: [user]
        }, { quoted: message });
    }
};
