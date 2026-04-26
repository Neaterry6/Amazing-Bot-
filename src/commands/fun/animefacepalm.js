import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animefacepalm',
    category: 'fun',
    description: 'Send an anime facepalm reaction GIF',
    usage: 'animefacepalm',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'facepalm' });
        } catch (error) {
            console.error('animefacepalm error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
