import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animesmug',
    category: 'fun',
    description: 'Send an anime smug reaction GIF',
    usage: 'animesmug',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'smug' });
        } catch (error) {
            console.error('animesmug error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }
        return null;
    }
};
