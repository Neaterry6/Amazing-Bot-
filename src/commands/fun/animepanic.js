import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animepanic',
    category: 'fun',
    description: 'Send an anime panic reaction GIF',
    usage: 'animepanic',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'panic' });
        } catch (error) {
            console.error('animepanic error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
