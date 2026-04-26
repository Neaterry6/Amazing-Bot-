import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animetease',
    category: 'fun',
    description: 'Send an anime tease reaction GIF',
    usage: 'animetease',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'tease' });
        } catch (error) {
            console.error('animetease error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
