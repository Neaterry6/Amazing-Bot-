import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animenervous',
    category: 'fun',
    description: 'Send an anime nervous reaction GIF',
    usage: 'animenervous',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'nervous' });
        } catch (error) {
            console.error('animenervous error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
