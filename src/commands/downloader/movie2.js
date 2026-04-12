export default {
    name: 'movie2',
    category: 'search',
    description: 'Movie detail + download links',
    usage: 'movie2 <title or url>',
    cooldown: 8,

    async execute({ sock, message, from, args }) {
        if (!args.length) {
            return await sock.sendMessage(from, { text: 'Provide movie title or link' }, { quoted: message });
        }

        let query = args.join(' ');
        query = query.startsWith('http')
            ? `url=${encodeURIComponent(query)}`
            : `q=${encodeURIComponent(query)}`;

        try {
            const res = await fetch(`https://omegatech-api.dixonomega.tech/api/movie/movie2-detail?${query}`);
            const json = await res.json();

            let txt = `*${json.title || 'Movie'}*\n\n`;
            txt += `${json.description?.slice(0, 300) || 'No description available'}...\n\n`;
            txt += `⭐ Rating: ${json.rating?.value || 'N/A'}\n`;
            txt += `📅 Year: ${json.metadata?.year || 'N/A'}\n\n`;
            txt += '📥 *Downloads:*\n';

            if (Array.isArray(json.download) && json.download.length) {
                json.download.forEach((d) => {
                    txt += `• ${d.title || 'Link'} (${d.quality || 'unknown'}): ${d.url || 'N/A'}\n`;
                });
            } else {
                txt += 'No download links found.\n';
            }

            await sock.sendMessage(from, { text: txt }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: 'Failed or invalid link' }, { quoted: message });
        }

        return null;
    }
};
