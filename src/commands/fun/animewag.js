import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animewag',
    category: 'fun',
    description: 'Send an anime wag reaction GIF',
    usage: 'animewag',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'wag' });
        } catch (error) {
            console.error('animewag error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
