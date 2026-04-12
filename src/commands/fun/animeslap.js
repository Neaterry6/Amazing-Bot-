import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animeslap',
    category: 'fun',
    description: 'Send an anime slap reaction GIF',
    usage: 'animeslap',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'slap' });
        } catch (error) {
            console.error('animeslap error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
