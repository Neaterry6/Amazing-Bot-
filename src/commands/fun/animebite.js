import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animebite',
    category: 'fun',
    description: 'Send an anime bite reaction GIF',
    usage: 'animebite',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'bite' });
        } catch (error) {
            console.error('animebite error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
