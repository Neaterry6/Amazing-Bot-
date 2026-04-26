import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animestare',
    category: 'fun',
    description: 'Send an anime stare reaction GIF',
    usage: 'animestare',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'stare' });
        } catch (error) {
            console.error('animestare error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
