import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animedab',
    category: 'fun',
    description: 'Send an anime dab reaction GIF',
    usage: 'animedab',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'dab' });
        } catch (error) {
            console.error('animedab error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
