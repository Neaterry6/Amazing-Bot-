import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animedance',
    category: 'fun',
    description: 'Send an anime dance reaction GIF',
    usage: 'animedance',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'dance' });
        } catch (error) {
            console.error('animedance error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
