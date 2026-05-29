import axios from 'axios';

const SPOTIFY_SEARCH_URL = 'https://omegatech-api.dixonomega.tech/api/Search/Spotify';
const GENERIC_DOWNLOAD_URL = 'https://omegatech-api.dixonomega.tech/api/download/all';

function firstArray(value) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.results)) return value.results;
    if (Array.isArray(value?.result)) return value.result;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.tracks)) return value.tracks;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.data?.results)) return value.data.results;
    if (Array.isArray(value?.data?.tracks)) return value.data.tracks;
    return [];
}

function normalizeTrack(raw = {}) {
    const artists = Array.isArray(raw.artists)
        ? raw.artists.map((a) => a.name || a).filter(Boolean).join(', ')
        : raw.artist || raw.artists || raw.author || raw.owner || 'Unknown Artist';
    const spotifyUrl = raw.spotifyUrl || raw.spotify_url || raw.url || raw.link || raw.external_urls?.spotify || raw.externalUrl || '';
    return {
        title: raw.title || raw.name || raw.track || 'Unknown Track',
        artist: artists,
        album: raw.album?.name || raw.album || '',
        thumbnail: raw.thumbnail || raw.image || raw.cover || raw.album?.images?.[0]?.url || '',
        spotifyUrl,
        downloadUrl: raw.download || raw.downloadUrl || raw.audio || raw.audioUrl || raw.preview_url || ''
    };
}

async function spotifySearch(query) {
    const { data } = await axios.get(SPOTIFY_SEARCH_URL, {
        params: { action: 'search', query },
        timeout: 30000,
        headers: { 'User-Agent': 'Asta-Bot/1.0' }
    });

    const results = firstArray(data).map(normalizeTrack).filter((track) => track.title);
    if (!results.length) throw new Error(data?.message || 'No Spotify results found');
    return results[0];
}

async function spotifyDownload(track) {
    if (track.downloadUrl && /^https?:\/\//i.test(track.downloadUrl)) return track.downloadUrl;
    if (!track.spotifyUrl) throw new Error('Spotify URL not found in search result');

    const { data } = await axios.get(GENERIC_DOWNLOAD_URL, {
        params: { url: track.spotifyUrl },
        timeout: 60000,
        headers: { 'User-Agent': 'Asta-Bot/1.0' }
    });

    const audio = data?.result?.audio?.[0]?.url
        || data?.result?.download
        || data?.download
        || data?.downloadUrl
        || data?.url;
    if (!audio) throw new Error(data?.message || 'Spotify download URL not found');
    return audio;
}

export default {
    name: 'spotify',
    aliases: ['spdl', 'spotdl'],
    category: 'downloader',
    description: 'Search Spotify and send audio',
    usage: 'spotify <song name>',
    cooldown: 8,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const query = args.join(' ').trim();
        if (!query) {
            return await sock.sendMessage(from, { text: '❌ Usage: .spotify <song name>' }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });
            const track = await spotifySearch(query);
            const downloadUrl = await spotifyDownload(track);

            await sock.sendMessage(from, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: `${track.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 120)}.mp3`,
                contextInfo: track.thumbnail
                    ? {
                        externalAdReply: {
                            title: track.title,
                            body: track.artist,
                            thumbnailUrl: track.thumbnail,
                            sourceUrl: track.spotifyUrl,
                            renderLargerThumbnail: true,
                            mediaType: 1
                        }
                    }
                    : undefined
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            await sock.sendMessage(from, {
                text: `❌ Spotify failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
