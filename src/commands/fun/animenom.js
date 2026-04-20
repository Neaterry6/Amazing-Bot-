import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animenom',
    category: 'fun',
    description: 'Send an anime nom reaction GIF',
    usage: 'animenom',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'nom' });
        } catch (error) {
            console.error('animenom error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }
        return null;
    }
};
