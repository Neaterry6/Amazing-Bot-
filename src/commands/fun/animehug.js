import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animehug',
    category: 'fun',
    description: 'Send an anime hug reaction GIF',
    usage: 'animehug',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'hug' });
        } catch (error) {
            console.error('animehug error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
