import axios from 'axios';

export async function runAnimeAction({ sock, message, from, action }) {
    await sock.sendMessage(from, { text: '⏳ Please wait...' }, { quoted: message });

    const { data } = await axios.get(`https://api.waifu.pics/sfw/${action}`, { timeout: 15000 });
    const mediaUrl = data?.url;
    if (!mediaUrl) {
        throw new Error('No media URL returned');
    }

    const senderName = message?.pushName || 'Someone';
    const caption = `${senderName} gives a ${action}!`;

    const isVideoLike = /\.(mp4|webm)(\?|$)/i.test(mediaUrl);
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
