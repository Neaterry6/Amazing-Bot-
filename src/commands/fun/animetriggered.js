import { runAnimeAction } from '../../utils/animeAction.js';

export default {
    name: 'animetriggered',
    category: 'fun',
    description: 'Send an anime triggered reaction GIF',
    usage: 'animetriggered',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            await runAnimeAction({ sock, message, from, action: 'triggered' });
        } catch (error) {
            console.error('animetriggered error:', error);
            await sock.sendMessage(from, { text: '❌ Failed to fetch anime GIF. Try again later.' }, { quoted: message });
        }

        return null;
    }
};
