import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animekick',
    category: 'fun',
    description: 'Send an anime kick reaction GIF',
    usage: 'animekick',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'kick' });
        } catch (error) {
            console.error('animekick error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
