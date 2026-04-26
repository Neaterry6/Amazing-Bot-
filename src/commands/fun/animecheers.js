import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animecheers',
    category: 'fun',
    description: 'Send an anime cheers reaction GIF',
    usage: 'animecheers',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'cheers' });
        } catch (error) {
            console.error('animecheers error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
