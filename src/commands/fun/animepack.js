import axios from 'axios';

const ANIME_CMDS = ['chiho', 'doraemon', 'elaina', 'emilia', 'erza', 'exo', 'femdom', 'freefire', 'gamewallpaper', 'glasses', 'gremory', 'hacker', 'cosplay', 'cyber', 'akiyama', 'ana', 'art', 'asuna', 'ayuzawa', 'pat', 'nom'];

function getBody(message) {
    return message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || message?.message?.imageMessage?.caption
        || message?.message?.videoMessage?.caption
        || '';
}

const endpointMap = {
    pat: 'pat',
    nom: 'nom'
};

export default {
    name: 'chiho',
    aliases: ANIME_CMDS.filter(c => c !== 'chiho'),
    category: 'fun',
    description: 'Random anime image/actions bundle',
    usage: 'chiho',
    cooldown: 5,

    async execute({ sock, message, from, prefix }) {
        try {
            const body = getBody(message).trim();
            const invoked = body.startsWith(prefix)
                ? body.slice(prefix.length).split(/\s+/)[0].toLowerCase()
                : 'chiho';
            const cmd = ANIME_CMDS.includes(invoked) ? invoked : 'chiho';
            const endpoint = endpointMap[cmd] || 'neko';
            const { data } = await axios.get(`https://api.waifu.pics/sfw/${endpoint}`, { timeout: 15000 });
            if (!data?.url) throw new Error('No image returned by API');

            await sock.sendMessage(from, {
                image: { url: data.url },
                caption: `🎴 ${cmd}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: message });
        }
    }
};
