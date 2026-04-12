import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'animevideo2',
    aliases: ['randomanime'],
    category: 'media',
    description: 'Send a random anime video',
    usage: 'animevideo2',
    example: 'animevideo2',
    cooldown: 20,
    permissions: ['user'],

    async execute({ sock, message, from }) {
        const cacheDir = path.join(__dirname, '..', '..', '..', 'temp');
        await fs.ensureDir(cacheDir);
        const outFile = path.join(cacheDir, `animevideo2-${Date.now()}.mp4`);

        try {
            await sock.sendMessage(from, { text: '⏳ Fetching anime video...' }, { quoted: message });
            const { data } = await axios.get('https://jhunapi.mrbaylon4.repl.co/snauzk/?apikey=Marjhunapi', { timeout: 20000 });

            if (!data?.url) {
                throw new Error('API returned no video URL');
            }

            const streamRes = await axios.get(data.url, { responseType: 'stream', timeout: 30000 });
            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(outFile);
                streamRes.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            await sock.sendMessage(from, {
                text: 'YOUR ANIME VIDEO MY SENPAI💗',
                video: fs.createReadStream(outFile),
                mimetype: 'video/mp4'
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Anime API failed. Try again later or update the API endpoint.'
            }, { quoted: message });
        } finally {
            if (await fs.pathExists(outFile)) {
                await fs.remove(outFile);
            }
        }
    }
};
