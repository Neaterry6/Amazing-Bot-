import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animehi',
    category: 'fun',
    description: 'Send an anime hi reaction GIF',
    usage: 'animehi',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'hi' });
        } catch (error) {
            console.error('animehi error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
