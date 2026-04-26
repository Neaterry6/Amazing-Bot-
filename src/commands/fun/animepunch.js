import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animepunch',
    category: 'fun',
    description: 'Send an anime punch reaction GIF',
    usage: 'animepunch',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'punch' });
        } catch (error) {
            console.error('animepunch error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
