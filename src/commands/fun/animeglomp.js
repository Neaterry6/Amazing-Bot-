import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animeglomp',
    category: 'fun',
    description: 'Send an anime glomp reaction GIF',
    usage: 'animeglomp',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'glomp' });
        } catch (error) {
            console.error('animeglomp error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
