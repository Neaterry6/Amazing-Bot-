import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animebonk',
    category: 'fun',
    description: 'Send an anime bonk reaction GIF',
    usage: 'animebonk',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'bonk' });
        } catch (error) {
            console.error('animebonk error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
