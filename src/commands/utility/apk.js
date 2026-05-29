import { appCaption, downloadApkBuffer, formatAppList, searchApk, searchPlayStore } from '../../utils/apkService.js';

export default {
    name: 'apk',
    aliases: ['apkdl', 'apkdownload'],
    category: 'utility',
    description: 'Search and send an APK file when a free direct APK source is available',
    usage: 'apk <app name|package name>',
    args: true,
    minArgs: 1,
    cooldown: 10,

    async execute({ sock, message, from, args, prefix }) {
        const query = args.join(' ').trim();
        if (!query) {
            return sock.sendMessage(from, { text: `❌ Usage: ${prefix}apk <app name or package>` }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🔎', key: message.key } }).catch(() => {});

            let results = await searchApk(query);
            if (!results.some((app) => app.downloadUrl)) {
                const playResults = await searchPlayStore(query).catch(() => []);
                results = [...results, ...playResults];
            }

            if (!results.length) {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
                return sock.sendMessage(from, { text: `❌ No APK results found for *${query}*.` }, { quoted: message });
            }

            const app = results.find((item) => item.downloadUrl) || results[0];
            if (!app.downloadUrl) {
                await sock.sendMessage(from, { react: { text: 'ℹ️', key: message.key } }).catch(() => {});
                return sock.sendMessage(from, {
                    text: `📦 *APK Search Results for:* ${query}\n\n${formatAppList(results, prefix, 'apk')}\n\nNo free direct APK file link was available for the top result.`
                }, { quoted: message });
            }

            await sock.sendMessage(from, { text: `⬇️ Downloading *${app.name || app.packageName}* APK...` }, { quoted: message });
            const apk = await downloadApkBuffer(app);

            await sock.sendMessage(from, {
                document: apk.buffer,
                mimetype: apk.mimetype,
                fileName: apk.fileName,
                caption: appCaption(app)
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } }).catch(() => {});
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            await sock.sendMessage(from, {
                text: `❌ APK download failed: ${error.message}\n\nTry another app name or package id. Free APK sources may block protected, paid, split-only, or region-restricted apps.`
            }, { quoted: message });
        }
    }
};
