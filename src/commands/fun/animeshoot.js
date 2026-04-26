import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animeshoot',
    category: 'fun',
    description: 'Send an anime shoot reaction GIF',
    usage: 'animeshoot',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'shoot' });
        } catch (error) {
            console.error('animeshoot error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
