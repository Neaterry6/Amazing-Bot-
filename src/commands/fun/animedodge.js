import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animedodge',
    category: 'fun',
    description: 'Send an anime dodge reaction GIF',
    usage: 'animedodge',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'dodge' });
        } catch (error) {
            console.error('animedodge error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
