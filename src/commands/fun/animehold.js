import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animehold',
    category: 'fun',
    description: 'Send an anime hold reaction GIF',
    usage: 'animehold',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'hold' });
        } catch (error) {
            console.error('animehold error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
