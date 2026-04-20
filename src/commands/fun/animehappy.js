import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animehappy',
    category: 'fun',
    description: 'Send an anime happy reaction GIF',
    usage: 'animehappy',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'happy' });
        } catch (error) {
            console.error('animehappy error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }
        return null;
    }
};
