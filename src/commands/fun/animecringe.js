import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animecringe',
    category: 'fun',
    description: 'Send an anime cringe reaction GIF',
    usage: 'animecringe',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'cringe' });
        } catch (error) {
            console.error('animecringe error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
