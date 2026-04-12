import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
    name: 'openfile',
    aliases: ['open', 'readfile'],
    category: 'utility',
    description: 'Read and send content of replied file',
    usage: 'openfile (reply to document)',
    cooldown: 4,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, from }) {
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.documentMessage) {
                return await sock.sendMessage(from, { text: '❌ Reply to a document file.' }, { quoted: message });
            }

            const fileName = quoted.documentMessage.fileName || 'file.txt';
            const ext = path.extname(fileName).toLowerCase();
            if (!['.txt', '.json', '.js', '.md', '.log', '.ts', '.env', '.yaml', '.yml'].includes(ext)) {
                return await sock.sendMessage(from, { text: '❌ Only text-like files are supported.' }, { quoted: message });
            }

            const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {
                reuploadRequest: sock.updateMediaMessage
            });

            await sock.sendMessage(from, {
                text: `📄 *${fileName}*\n\n${buffer.toString('utf8').slice(0, 3900)}`
            }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ Failed to read file (expired/too large).' }, { quoted: message });
        }
    }
};
