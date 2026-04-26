import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animeangry',
    category: 'fun',
    description: 'Send an anime angry reaction GIF',
    usage: 'animeangry',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'angry' });
        } catch (error) {
            console.error('animeangry error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
