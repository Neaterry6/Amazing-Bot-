export default {
    name: 'askprompt',
    aliases: ['askname'],
    category: 'asta_addons',
    description: 'Prompt a user to reply with their name',
    usage: 'askprompt',
    cooldown: 3,

    async execute({ sock, message, from }) {
        await sock.sendMessage(from, {
            text: 'Reply to this message with your name:'
        }, { quoted: message });
    }
};
