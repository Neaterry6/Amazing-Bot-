import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animewink',
    category: 'fun',
    description: 'Send an anime wink reaction GIF',
    usage: 'animewink',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'wink' });
        } catch (error) {
            console.error('animewink error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
