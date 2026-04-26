import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animehighfive',
    category: 'fun',
    description: 'Send an anime highfive reaction GIF',
    usage: 'animehighfive',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'highfive' });
        } catch (error) {
            console.error('animehighfive error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
