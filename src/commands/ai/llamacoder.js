import axios from 'axios';
import archiver from 'archiver';
import { PassThrough } from 'stream';

function truncate(text = '', max = 3500) {
    const value = String(text || '');
    return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function zipFiles(files = []) {
    return await new Promise((resolve, reject) => {
        const passThrough = new PassThrough();
        const chunks = [];

        passThrough.on('data', (chunk) => chunks.push(chunk));
        passThrough.on('end', () => resolve(Buffer.concat(chunks)));
        passThrough.on('error', reject);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', reject);
        archive.pipe(passThrough);

        for (const file of files) {
            const name = String(file?.path || file?.name || 'file.txt').replace(/^\/+/, '') || 'file.txt';
            archive.append(file?.content || '', { name });
        }

        archive.finalize();
    });
}

export default {
    name: 'llamacoder',
    aliases: ['llama', 'codegen'],
    category: 'ai',
    description: 'Generate a React + TypeScript + Tailwind app and receive the files as a zip',
    usage: 'llamacoder <what to build>',
    example: 'llamacoder a todo app with dark mode',
    cooldown: 20,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, prefix, command }) {
        const text = args.join(' ').trim();
        if (!text) {
            return await sock.sendMessage(from, {
                text: `🦙 *LlamaCoder — AI React Generator*\n\n*Usage:*\n${prefix}${command.name || 'llamacoder'} <what to build>\n\n*Examples:*\n${prefix}${command.name || 'llamacoder'} a todo app with dark mode\n${prefix}${command.name || 'llamacoder'} a dashboard with charts\n${prefix}${command.name || 'llamacoder'} a calculator app\n\n💡 Describe your idea and get a full React + TypeScript + Tailwind app!`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🦙', key: message.key } });
            await sock.sendMessage(from, { text: '⏳ LlamaCoder is building your app, please wait...' }, { quoted: message });

            const { data } = await axios.get('https://omegatech-api.dixonomega.tech/api/ai/llamacoder', {
                params: { action: 'create', prompt: text, quality: 'low' },
                timeout: 120000,
                headers: { 'User-Agent': 'Asta-Bot/1.0' }
            });

            if (!data?.success) throw new Error(data?.error || data?.message || 'LlamaCoder API failed');

            const files = Array.isArray(data.files) ? data.files : [];
            const rawOutput = data.rawOutput || data.output || data.result || '';

            if (!files.length) {
                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
                return await sock.sendMessage(from, {
                    text: `🦙 *LlamaCoder*\n\n${truncate(rawOutput || 'No files were returned by the API.')}`
                }, { quoted: message });
            }

            const zipBuffer = await zipFiles(files);
            await sock.sendMessage(from, {
                text: `🦙 *LlamaCoder Result*\n━━━━━━━━━━━━━━━\n📝 *Prompt:* ${text}\n📁 *Files Generated:* ${files.length}\n${files.map((f) => `  • ${f.path || f.name || 'file.txt'}`).join('\n')}\n━━━━━━━━━━━━━━━`
            }, { quoted: message });

            await sock.sendMessage(from, {
                document: zipBuffer,
                mimetype: 'application/zip',
                fileName: `llamacoder-${data.chatId || Date.now()}.zip`
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            const msg = error?.response?.data
                ? JSON.stringify(error.response.data)
                : error.message || 'Unknown error';
            return await sock.sendMessage(from, {
                text: `💥 *LlamaCoder Error:*\n${msg}`
            }, { quoted: message });
        }
    }
};
