import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animethink',
    category: 'fun',
    description: 'Send an anime think reaction GIF',
    usage: 'animethink',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'think' });
        } catch (error) {
            console.error('animethink error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
