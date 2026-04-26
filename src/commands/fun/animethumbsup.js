import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animethumbsup',
    category: 'fun',
    description: 'Send an anime thumbsup reaction GIF',
    usage: 'animethumbsup',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'thumbsup' });
        } catch (error) {
            console.error('animethumbsup error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
