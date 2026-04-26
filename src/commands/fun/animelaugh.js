import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animelaugh',
    category: 'fun',
    description: 'Send an anime laugh reaction GIF',
    usage: 'animelaugh',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'laugh' });
        } catch (error) {
            console.error('animelaugh error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
