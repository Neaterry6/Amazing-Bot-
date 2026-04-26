import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animeshrug',
    category: 'fun',
    description: 'Send an anime shrug reaction GIF',
    usage: 'animeshrug',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'shrug' });
        } catch (error) {
            console.error('animeshrug error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
