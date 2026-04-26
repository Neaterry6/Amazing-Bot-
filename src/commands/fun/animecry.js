import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animecry',
    category: 'fun',
    description: 'Send an anime cry reaction GIF',
    usage: 'animecry',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'cry' });
        } catch (error) {
            console.error('animecry error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
