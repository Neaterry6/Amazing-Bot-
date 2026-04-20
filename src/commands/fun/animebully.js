import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animebully',
    category: 'fun',
    description: 'Send an anime bully reaction GIF',
    usage: 'animebully',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'bully' });
        } catch (error) {
            console.error('animebully error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }
        return null;
    }
};
