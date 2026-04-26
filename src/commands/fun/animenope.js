import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animenope',
    category: 'fun',
    description: 'Send an anime nope reaction GIF',
    usage: 'animenope',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'nope' });
        } catch (error) {
            console.error('animenope error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
