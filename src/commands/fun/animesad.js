import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animesad',
    category: 'fun',
    description: 'Send an anime sad reaction GIF',
    usage: 'animesad',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'sad' });
        } catch (error) {
            console.error('animesad error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
