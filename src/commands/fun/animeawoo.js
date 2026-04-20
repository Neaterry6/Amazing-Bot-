import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animeawoo',
    category: 'fun',
    description: 'Send an anime awoo reaction GIF',
    usage: 'animeawoo',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'awoo' });
        } catch (error) {
            console.error('animeawoo error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }
        return null;
    }
};
