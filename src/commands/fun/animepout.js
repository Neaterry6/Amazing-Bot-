import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animepout',
    category: 'fun',
    description: 'Send an anime pout reaction GIF',
    usage: 'animepout',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'pout' });
        } catch (error) {
            console.error('animepout error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
