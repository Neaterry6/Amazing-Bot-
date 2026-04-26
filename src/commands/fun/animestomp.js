import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animestomp',
    category: 'fun',
    description: 'Send an anime stomp reaction GIF',
    usage: 'animestomp',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'stomp' });
        } catch (error) {
            console.error('animestomp error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
