import axios from 'axios';
import { ApifyClient } from 'apify-client';

const OMEGA_API = 'https://omegatech-api.dixonomega.tech/api/download/all?url=';
const APIFY_ACTOR_ID = 'easyapi/all-in-one-media-downloader';

function firstNonEmpty(...items) {
    for (const it of items) {
        if (typeof it === 'string' && it.trim()) return it.trim();
    }
    return '';
}

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
}

export function pickBestMedia(data = {}, prefer = 'video') {
    const candidates = [
        data?.download,
        data?.url,
        data?.link,
        data?.result?.download,
        data?.result?.url,
        data?.result?.link,
        data?.data?.download,
        data?.data?.url,
        data?.data?.link,
        data?.audio,
        data?.video,
        data?.result?.audio,
        data?.result?.video,
        data?.data?.audio,
        data?.data?.video
    ];

    const nestedList = [
        ...asArray(data?.media),
        ...asArray(data?.result?.media),
        ...asArray(data?.data?.media),
        ...asArray(data?.formats),
        ...asArray(data?.result?.formats),
        ...asArray(data?.data?.formats)
    ];

    for (const row of nestedList) {
        if (!row || typeof row !== 'object') continue;
        const byType = prefer === 'audio'
            ? firstNonEmpty(row.audio, row.audioUrl, row.url)
            : firstNonEmpty(row.video, row.videoUrl, row.url);
        if (byType) return byType;
        const generic = firstNonEmpty(row.download, row.link, row.url, row.file);
        if (generic) candidates.push(generic);
    }

    return firstNonEmpty(...candidates);
}

export function parseAllInOneMeta(payload = {}) {
    const data = payload?.data || payload?.result || payload;
    return {
        title: firstNonEmpty(data?.title, data?.name, data?.result?.title) || 'Unknown title',
        artist: firstNonEmpty(data?.artist, data?.author, data?.uploader, data?.channel) || 'Unknown artist',
        duration: firstNonEmpty(data?.duration, data?.timestamp, data?.length) || 'Unknown',
        thumbnail: firstNonEmpty(
            data?.thumbnail,
            data?.thumb,
            data?.image,
            data?.cover,
            data?.result?.thumbnail,
            data?.result?.thumb
        ),
        sourceUrl: firstNonEmpty(data?.source, data?.url, data?.link)
    };
}

export async function fetchAllInOneDownload(url) {
    const apifyToken = (process.env.APIFY_API_TOKEN || '').trim();
    if (apifyToken) {
        const client = new ApifyClient({ token: apifyToken });
        const input = { url };
        const run = await client.actor(APIFY_ACTOR_ID).call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });
        if (items?.length) return items[0];
    }

    const endpoint = `${OMEGA_API}${encodeURIComponent(url)}`;
    const { data } = await axios.get(endpoint, {
        timeout: 45000,
        headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/json'
        }
    });
    return data;
}
