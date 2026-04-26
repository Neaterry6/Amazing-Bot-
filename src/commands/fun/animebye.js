import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animebye',
    category: 'fun',
    description: 'Send an anime bye reaction GIF',
    usage: 'animebye',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'bye' });
        } catch (error) {
            console.error('animebye error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
