import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animedisappear',
    category: 'fun',
    description: 'Send an anime disappear reaction GIF',
    usage: 'animedisappear',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'disappear' });
        } catch (error) {
            console.error('animedisappear error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
