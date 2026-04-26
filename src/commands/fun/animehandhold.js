import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animehandhold',
    category: 'fun',
    description: 'Send an anime handhold reaction GIF',
    usage: 'animehandhold',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'handhold' });
        } catch (error) {
            console.error('animehandhold error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
