import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animesmile',
    category: 'fun',
    description: 'Send an anime smile reaction GIF',
    usage: 'animesmile',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'smile' });
        } catch (error) {
            console.error('animesmile error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
