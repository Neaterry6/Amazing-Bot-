import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animeyawn',
    category: 'fun',
    description: 'Send an anime yawn reaction GIF',
    usage: 'animeyawn',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'yawn' });
        } catch (error) {
            console.error('animeyawn error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
