import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animefeed',
    category: 'fun',
    description: 'Send an anime feed reaction GIF',
    usage: 'animefeed',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'feed' });
        } catch (error) {
            console.error('animefeed error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
