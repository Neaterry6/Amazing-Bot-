import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animechase',
    category: 'fun',
    description: 'Send an anime chase reaction GIF',
    usage: 'animechase',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'chase' });
        } catch (error) {
            console.error('animechase error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
