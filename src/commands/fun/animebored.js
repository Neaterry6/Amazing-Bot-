import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animebored',
    category: 'fun',
    description: 'Send an anime bored reaction GIF',
    usage: 'animebored',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'bored' });
        } catch (error) {
            console.error('animebored error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
