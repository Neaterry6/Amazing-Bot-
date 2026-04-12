import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animekiss',
    category: 'fun',
    description: 'Send an anime kiss reaction GIF',
    usage: 'animekiss',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'kiss' });
        } catch (error) {
            console.error('animekiss error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
