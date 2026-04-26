import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animelick',
    category: 'fun',
    description: 'Send an anime lick reaction GIF',
    usage: 'animelick',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'lick' });
        } catch (error) {
            console.error('animelick error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
