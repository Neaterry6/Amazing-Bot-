import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animetickle',
    category: 'fun',
    description: 'Send an anime tickle reaction GIF',
    usage: 'animetickle',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'tickle' });
        } catch (error) {
            console.error('animetickle error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
