import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animelove',
    category: 'fun',
    description: 'Send an anime love reaction GIF',
    usage: 'animelove',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'love' });
        } catch (error) {
            console.error('animelove error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
