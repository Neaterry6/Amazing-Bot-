import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animekill',
    category: 'fun',
    description: 'Send an anime kill reaction GIF',
    usage: 'animekill',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'kill' });
        } catch (error) {
            console.error('animekill error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
