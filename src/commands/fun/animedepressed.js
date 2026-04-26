import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animedepressed',
    category: 'fun',
    description: 'Send an anime depressed reaction GIF',
    usage: 'animedepressed',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'depressed' });
        } catch (error) {
            console.error('animedepressed error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
