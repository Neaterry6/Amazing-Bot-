import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animepack',
    aliases: ['animepat'],
    category: 'fun',
    description: 'Send an anime pat reaction GIF',
    usage: 'animepack',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'pat' });
        } catch (error) {
            console.error('animepack error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
