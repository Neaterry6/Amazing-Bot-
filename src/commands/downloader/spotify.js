import ky from 'ky';

async function spotifySearch(query) {
    const payload = await ky
        .get('https://omegatech-api.dixonomega.tech/api/Search/Spotify', {
            searchParams: { q: query },
            timeout: 30000
        })
        .json();

    if (!payload?.success || !Array.isArray(payload?.results) || payload.results.length === 0) {
        throw new Error('No Spotify results found');
    }

    return payload.results[0];
}

async function spotifyDownload(id) {
    const payload = await ky
        .get('https://omegatech-api.dixonomega.tech/api/download/Spotify-dl', {
            searchParams: { id },
            timeout: 30000
        })
        .json();

    if (!payload?.success || !payload?.downloadUrl) {
        throw new Error('Spotify download URL not found');
    }

    return payload.downloadUrl;
}

export default {
    name: 'spotify',
    aliases: ['spdl', 'spotdl'],
    category: 'downloader',
    description: 'Search Spotify and send song audio + details',
    usage: 'spotify <song name>',
    example: 'spotify Alone Alan Walker',
    cooldown: 8,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const query = args.join(' ').trim();
        if (!query) {
            return await sock.sendMessage(from, {
                text: '❌ Usage: .spotify <song name>'
            }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🎧', key: message.key } });

        try {
            const track = await spotifySearch(query);
            const downloadUrl = await spotifyDownload(track.id);

            const caption =
                '🎵 *Spotify Download*\n\n' +
                `📌 *Title:* ${track.title}\n` +
                `🎤 *Artist:* ${track.artist}\n` +
                `💿 *Album:* ${track.album}\n` +
                `🆔 *Track ID:* ${track.id}`;

            await sock.sendMessage(from, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: track.cover
                    ? {
                        externalAdReply: {
                            title: track.title,
                            body: track.artist,
                            thumbnailUrl: track.cover,
                            sourceUrl: `https://open.spotify.com/track/${track.id}`,
                            renderLargerThumbnail: true,
                            mediaType: 1
                        }
                    }
                    : undefined
            }, { quoted: message });

            await sock.sendMessage(from, { text: caption }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Spotify command failed: ${error.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
