import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animescared',
    category: 'fun',
    description: 'Send an anime scared reaction GIF',
    usage: 'animescared',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'scared' });
        } catch (error) {
            console.error('animescared error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
