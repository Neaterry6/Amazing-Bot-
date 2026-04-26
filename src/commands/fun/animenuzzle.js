import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animenuzzle',
    category: 'fun',
    description: 'Send an anime nuzzle reaction GIF',
    usage: 'animenuzzle',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'nuzzle' });
        } catch (error) {
            console.error('animenuzzle error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
