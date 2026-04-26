import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animehum',
    category: 'fun',
    description: 'Send an anime hum reaction GIF',
    usage: 'animehum',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'hum' });
        } catch (error) {
            console.error('animehum error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
