import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animesip',
    category: 'fun',
    description: 'Send an anime sip reaction GIF',
    usage: 'animesip',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'sip' });
        } catch (error) {
            console.error('animesip error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
