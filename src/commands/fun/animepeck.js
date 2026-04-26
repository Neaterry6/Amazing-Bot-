import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animepeck',
    category: 'fun',
    description: 'Send an anime peck reaction GIF',
    usage: 'animepeck',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'peck' });
        } catch (error) {
            console.error('animepeck error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
