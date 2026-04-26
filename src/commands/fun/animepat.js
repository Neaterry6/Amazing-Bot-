import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animepat',
    aliases: ['animepack'],
    category: 'fun',
    description: 'Send an anime pat reaction GIF',
    usage: 'animepat',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'pat' });
        } catch (error) {
            console.error('animepat error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
