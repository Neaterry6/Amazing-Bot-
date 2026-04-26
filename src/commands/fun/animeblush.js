import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animeblush',
    category: 'fun',
    description: 'Send an anime blush reaction GIF',
    usage: 'animeblush',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'blush' });
        } catch (error) {
            console.error('animeblush error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
