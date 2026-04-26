import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animepoke',
    category: 'fun',
    description: 'Send an anime poke reaction GIF',
    usage: 'animepoke',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'poke' });
        } catch (error) {
            console.error('animepoke error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
