import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animerun',
    category: 'fun',
    description: 'Send an anime run reaction GIF',
    usage: 'animerun',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'run' });
        } catch (error) {
            console.error('animerun error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
