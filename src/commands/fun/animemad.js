import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animemad',
    category: 'fun',
    description: 'Send an anime mad reaction GIF',
    usage: 'animemad',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'mad' });
        } catch (error) {
            console.error('animemad error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
