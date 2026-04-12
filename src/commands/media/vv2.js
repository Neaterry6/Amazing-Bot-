export default {
    name: 'vv2',
    category: 'media',
    description: 'Alias helper for vv/view-once extraction',
    usage: 'vv2 (reply to view-once media)',
    cooldown: 5,

    async execute({ sock, message, from, prefix }) {
        await sock.sendMessage(from, {
            text: `Use *${prefix}vv* for full view-once extraction.\n
This alias is kept for compatibility.`
        }, { quoted: message });
    }
};
