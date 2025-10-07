import axios from 'axios';

export default {
    name: 'applemusic',
    aliases: ['apple', 'amusic'],
    category: 'downloader',
    description: 'Fetch Apple Music search results',
    usage: 'applemusic <query>',
    example: 'applemusic Baby',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: Infinity,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: true,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const query = args.join(' ').trim();
            if (!query) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nPlease provide a search query.\n\n📜 *Usage*: \`${prefix}applemusic <query>\`\n🎯 *Example*: \`${prefix}applemusic Baby\``
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { react: { text: '🎶', key: message.key } });
            const processMessage = await sock.sendMessage(from, {
                text: `🎶 *Searching Apple Music*: ${query}...`
            }, { quoted: message });

            const response = await axios.get(`https://kaiz-apis.gleeze.com/api/apple-music?search=${encodeURIComponent(query)}&apikey=a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea`, { timeout: 10000 });
            const tracks = response.data?.results || [];

            if (!tracks.length) {
                await sock.sendMessage(from, { delete: processMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nNo tracks found for "${query}".\n\n💡 Try another query!`
                }, { quoted: message });
                return;
            }

            let reply = `🎶 *Apple Music*: ${query}\n\n`;
            tracks.slice(0, 5).forEach((track, index) => {
                reply += `**${index + 1}. ${track.name}**\n`;
                reply += `- *Artist*: ${track.artistName}\n`;
                reply += `- *Album*: ${track.collectionName || 'N/A'}\n`;
                if (track.url) reply += `- *Link*: ${track.url}\n`;
                reply += '\n';
            });

            await sock.sendMessage(from, { delete: processMessage.key });
            await sock.sendMessage(from, { text: reply }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Apple Music command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch tracks: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
