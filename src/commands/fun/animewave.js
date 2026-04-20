import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animewave',
    category: 'fun',
    description: 'Send an anime wave reaction GIF',
    usage: 'animewave',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'wave' });
        } catch (error) {
            console.error('animewave error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }
        return null;
    }
};
