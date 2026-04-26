import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animedie',
    category: 'fun',
    description: 'Send an anime die reaction GIF',
    usage: 'animedie',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'die' });
        } catch (error) {
            console.error('animedie error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
