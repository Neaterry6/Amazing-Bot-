import { appCaption, downloadApkBuffer, formatAppList, searchApk, searchPlayStore } from '../../utils/apkService.js';

export default {
    name: 'playstore',
    aliases: ['app', 'store'],
    category: 'utility',
    description: 'Search Play Store apps and send APK file when a free direct APK source is available',
    usage: 'playstore <app name|package name>',
    example: 'playstore whatsapp',
    cooldown: 10,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: Infinity,
    typing: true,

    async execute({ sock, message, args, from, prefix }) {
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(from, { text: `❌ Usage: ${prefix}playstore <app name>` }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🔎', key: message.key } }).catch(() => {});
            const results = await searchPlayStore(query);

            if (!results.length) {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
                return sock.sendMessage(from, { text: `❌ No Play Store apps found for *${query}*.` }, { quoted: message });
            }

            const app = results[0];
            await sock.sendMessage(from, {
                text: `🔎 *Play Store Results for:* ${query}\n\n${formatAppList(results, prefix, 'playstore')}`
            }, { quoted: message });

            let downloadable = app.downloadUrl ? app : null;
            if (!downloadable) {
                const apkResults = await searchApk(app.packageName || app.name || query).catch(() => []);
                downloadable = apkResults.find((item) => item.downloadUrl) || null;
            }

            if (!downloadable) {
                await sock.sendMessage(from, { react: { text: 'ℹ️', key: message.key } }).catch(() => {});
                return sock.sendMessage(from, {
                    text: 'ℹ️ App info found, but no free direct APK file link was available. Try `.apk ' + (app.packageName || query) + '` or another app.'
                }, { quoted: message });
            }

            await sock.sendMessage(from, { text: `⬇️ Downloading *${downloadable.name || downloadable.packageName}* APK...` }, { quoted: message });
            const apk = await downloadApkBuffer(downloadable);

            await sock.sendMessage(from, {
                document: apk.buffer,
                mimetype: apk.mimetype,
                fileName: apk.fileName,
                caption: appCaption({ ...app, ...downloadable })
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } }).catch(() => {});
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            await sock.sendMessage(from, {
                text: `❌ Play Store lookup failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
