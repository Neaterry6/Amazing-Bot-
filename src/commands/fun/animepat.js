import axios from 'axios';

const ENDPOINT = 'pat';
const VERB = 'patted';
const SELF_ACTION = false;

function buildApiUrls() {
    return [
        `https://api.waifu.pics/sfw/${ENDPOINT}`,
        `https://nekos.best/api/v2/${ENDPOINT}`,
        `https://api.otakugifs.xyz/gif?reaction=${ENDPOINT}`
    ];
}

async function getGifUrl() {
    for (const apiUrl of buildApiUrls()) {
        try {
            const { data } = await axios.get(apiUrl, { timeout: 5000 });
            if (data?.url) return data.url;
            if (data?.results?.[0]?.url) return data.results[0].url;
        } catch {}
    }
    return null;
}

export default {
    name: 'animepat',
    category: 'fun',
    description: 'Anime reaction gif command',
    usage: 'animepat [@user]',
    cooldown: 3,

    async execute({ sock, message, from }) {
        const gifUrl = await getGifUrl();
        if (!gifUrl) {
            return sock.sendMessage(from, { text: '❌ All anime gif APIs are down rn :(' }, { quoted: message });
        }

        const sender = message.key.participant || message.key.remoteJid;
        const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const allMentions = [sender, ...mentions];

        let caption = `@${sender.split('@')[0]} ${VERB}`;
        if (!SELF_ACTION) {
            if (mentions.length > 0) {
                caption += ` ${mentions.map((jid) => `@${jid.split('@')[0]}`).join(', ')}`;
            } else {
                caption += ' themselves';
            }
        }

        return sock.sendMessage(from, {
            video: { url: gifUrl },
            gifPlayback: true,
            caption,
            mentions: allMentions
        }, { quoted: message });
    }
};
