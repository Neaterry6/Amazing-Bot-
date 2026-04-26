import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animesleepy',
    category: 'fun',
    description: 'Send an anime sleepy reaction GIF',
    usage: 'animesleepy',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'sleepy' });
        } catch (error) {
            console.error('animesleepy error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
