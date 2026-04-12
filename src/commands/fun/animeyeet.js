import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animeyeet',
    category: 'fun',
    description: 'Send an anime yeet reaction GIF',
    usage: 'animeyeet',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'yeet' });
        } catch (error) {
            console.error('animeyeet error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
