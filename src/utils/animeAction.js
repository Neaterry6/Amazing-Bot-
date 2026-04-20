import axios from 'axios';

export async function runAnimeAction({ sock, message, from, action }) {
    await sock.sendMessage(from, { text: '⏳ Please wait...' }, { quoted: message });
    const endpointMap = {
        slap: 'slap',
        dance: 'dance',
        happy: 'happy',
        smug: 'smug',
        awoo: 'awoo',
        wave: 'wave',
        smile: 'smile',
        nom: 'nom',
        poke: 'poke',
        wink: 'wink',
        bully: 'bully',
        bite: 'bite',
        kill: 'kill'
    };
    const endpoint = endpointMap[action] || action;
    const { data } = await axios.get(`https://apis.prexzyvilla.site/anime/${endpoint}`, { timeout: 25000 });
    const payload = data?.result || data?.data || data;
    const mediaUrl = payload?.url || payload?.gif || payload?.video || payload?.image;
    if (!mediaUrl) {
        throw new Error('No media URL returned');
    }

    const senderName = message?.pushName || 'Someone';
    const caption = `${senderName} gives a ${action}!`;

    const isVideoLike = /\.(mp4|webm|mov|mkv)(\?|$)/i.test(mediaUrl);
    if (isVideoLike) {
        await sock.sendMessage(from, {
            video: { url: mediaUrl },
            gifPlayback: true,
            caption
        }, { quoted: message });
        return;
    }

    await sock.sendMessage(from, {
        image: { url: mediaUrl },
        caption
    }, { quoted: message });
}
