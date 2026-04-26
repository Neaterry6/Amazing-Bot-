import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animecuddle',
    category: 'fun',
    description: 'Send an anime cuddle reaction GIF',
    usage: 'animecuddle',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'cuddle' });
        } catch (error) {
            console.error('animecuddle error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
