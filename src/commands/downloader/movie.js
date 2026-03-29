import axios from 'axios';

const API_BASE = 'https://movieapi.xcasper.space/api';

function trimText(text = '', max = 500) {
    const t = String(text);
    return t.length > max ? `${t.slice(0, max - 3)}...` : t;
}

export default {
    name: 'movie',
    aliases: ['film', 'mv'],
    category: 'downloader',
    description: 'Search movies/series and get playable stream links',
    usage: 'movie <search|trending|hot|detail|play> [query|subjectId]',
    example: 'movie search avatar\nmovie trending\nmovie detail 5154075108704669480\nmovie play 5154075108704669480',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const sub = (args[0] || '').toLowerCase();
        const q = args.slice(1).join(' ').trim();

        try {
            if (sub === 'search') {
                if (!q) {
                    return await sock.sendMessage(from, { text: '❌ Usage: movie search <keyword>' }, { quoted: message });
                }

                const { data } = await axios.get(`${API_BASE}/search`, {
                    params: { keyword: q, page: 1, perPage: 10, subjectType: 1 },
                    timeout: 20000
                });

                const list = data?.data || data?.result || data?.items || [];
                if (!Array.isArray(list) || !list.length) {
                    return await sock.sendMessage(from, { text: `❌ No results for: ${q}` }, { quoted: message });
                }

                const lines = list.slice(0, 10).map((item, i) => {
                    const title = item?.title || item?.name || item?.subjectName || 'Unknown';
                    const id = item?.subjectId || item?.id || 'N/A';
                    const year = item?.year || item?.releaseYear || '';
                    return `${i + 1}. *${title}* ${year ? `(${year})` : ''}\n   ID: ${id}`;
                });

                return await sock.sendMessage(from, {
                    text: `🎬 *Movie Search Results*\n\n${lines.join('\n\n')}\n\nUse:\n.movie detail <ID>\n.movie play <ID>`
                }, { quoted: message });
            }

            if (sub === 'trending' || sub === 'hot') {
                const endpoint = sub === 'hot' ? 'hot' : 'trending';
                const { data } = await axios.get(`${API_BASE}/${endpoint}`, {
                    params: endpoint === 'trending' ? { page: 0, perPage: 18 } : {},
                    timeout: 20000
                });

                const list = data?.data || data?.result || data?.items || [];
                if (!Array.isArray(list) || !list.length) {
                    return await sock.sendMessage(from, { text: `❌ No ${sub} items right now.` }, { quoted: message });
                }

                const lines = list.slice(0, 12).map((item, i) => {
                    const title = item?.title || item?.name || item?.subjectName || 'Unknown';
                    const id = item?.subjectId || item?.id || 'N/A';
                    return `${i + 1}. *${title}*\n   ID: ${id}`;
                });

                return await sock.sendMessage(from, {
                    text: `🔥 *${sub === 'hot' ? 'Hot' : 'Trending'} Movies*\n\n${lines.join('\n\n')}`
                }, { quoted: message });
            }

            if (sub === 'detail') {
                if (!q) return await sock.sendMessage(from, { text: '❌ Usage: movie detail <subjectId>' }, { quoted: message });

                const { data } = await axios.get(`${API_BASE}/rich-detail`, {
                    params: { subjectId: q },
                    timeout: 20000
                });

                const item = data?.data || data?.result || data;
                if (!item || typeof item !== 'object') {
                    return await sock.sendMessage(from, { text: '❌ Movie detail not found.' }, { quoted: message });
                }

                const title = item?.title || item?.name || item?.subjectName || 'Unknown';
                const year = item?.year || item?.releaseYear || 'N/A';
                const country = item?.countryName || item?.country || 'N/A';
                const genre = Array.isArray(item?.genres) ? item.genres.join(', ') : (item?.genre || 'N/A');
                const desc = trimText(item?.description || item?.desc || item?.summary || 'No description', 700);

                return await sock.sendMessage(from, {
                    text: `🎞️ *${title}*\n\n🆔 ID: ${q}\n📅 Year: ${year}\n🌍 Country: ${country}\n🎭 Genre: ${genre}\n\n📝 ${desc}\n\nUse *.movie play ${q}* to get stream links.`
                }, { quoted: message });
            }

            if (sub === 'play') {
                if (!q) return await sock.sendMessage(from, { text: '❌ Usage: movie play <subjectId>' }, { quoted: message });

                const [playRes, streamRes] = await Promise.allSettled([
                    axios.get(`${API_BASE}/play`, { params: { subjectId: q }, timeout: 20000 }),
                    axios.get(`${API_BASE}/bff/stream`, { params: { subjectId: q }, timeout: 20000 })
                ]);

                const playData = playRes.status === 'fulfilled' ? playRes.value.data : null;
                const streamData = streamRes.status === 'fulfilled' ? streamRes.value.data : null;

                const text = [
                    `🎬 *Movie Streams*`,
                    `ID: ${q}`,
                    '',
                    `▶️ play:`,
                    '```',
                    trimText(JSON.stringify(playData || { error: 'play endpoint failed' }, null, 2), 2000),
                    '```',
                    '',
                    `📡 bff/stream:`,
                    '```',
                    trimText(JSON.stringify(streamData || { error: 'bff/stream endpoint failed' }, null, 2), 2000),
                    '```'
                ].join('\n');

                return await sock.sendMessage(from, { text }, { quoted: message });
            }

            return await sock.sendMessage(from, {
                text: '❌ Usage:\n.movie search <keyword>\n.movie trending\n.movie hot\n.movie detail <subjectId>\n.movie play <subjectId>'
            }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, {
                text: `❌ Movie command failed: ${error?.response?.data?.message || error.message}`
            }, { quoted: message });
        }
    }
};
