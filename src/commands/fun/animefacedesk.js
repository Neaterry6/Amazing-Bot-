import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animefacedesk',
    category: 'fun',
    description: 'Send an anime facedesk reaction GIF',
    usage: 'animefacedesk',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'facedesk' });
        } catch (error) {
            console.error('animefacedesk error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
