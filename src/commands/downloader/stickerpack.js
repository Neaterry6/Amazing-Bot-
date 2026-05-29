import axios from 'axios';
import pkg from 'wa-sticker-formatter';

const { Sticker, StickerTypes } = pkg;
const STICKER_API = 'https://omegatech-api-lscz.onrender.com/api/tools/Sticker';

function getPacks(payload) {
    return payload?.data?.result?.stickerPacks
        || payload?.result?.stickerPacks
        || payload?.stickerPacks
        || payload?.data?.stickerPacks
        || [];
}

async function searchPacks(keyword) {
    const { data } = await axios.get(STICKER_API, {
        params: { action: 'search', keyword, needRelation: true },
        timeout: 45000,
        headers: { 'User-Agent': 'Asta-Bot/1.0' }
    });
    if (!data?.success) throw new Error(data?.message || 'Sticker search failed');
    return getPacks(data);
}

async function fetchPack(packId) {
    try {
        const { data } = await axios.get(STICKER_API, {
            params: { action: 'download', packId },
            timeout: 45000,
            headers: { 'User-Agent': 'Asta-Bot/1.0' }
        });
        const packs = getPacks(data);
        return data?.data?.result || data?.result || packs[0] || null;
    } catch {
        const packs = await searchPacks(packId);
        return packs.find((pack) => String(pack.packId).toLowerCase() === String(packId).toLowerCase()) || packs[0] || null;
    }
}

function packResources(pack = {}) {
    const prefix = pack.resourceUrlPrefix || pack.resourceUrl || '';
    const files = Array.isArray(pack.resourceFiles) ? pack.resourceFiles : [];
    return files.map((file) => /^https?:\/\//i.test(file) ? file : `${prefix}${file}`);
}

async function imageUrlToStickerBuffer(url, packName, authorName) {
    const { data } = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 45000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const sticker = new Sticker(Buffer.from(data), {
        pack: packName || 'Sticker Pack',
        author: authorName || 'Asta Bot',
        type: StickerTypes.FULL,
        quality: 80,
        categories: ['✨']
    });
    return await sticker.toBuffer();
}

export default {
    name: 'stickerpack',
    aliases: ['stickers', 'stickersearch', 'stickerly'],
    category: 'downloader',
    description: 'Search Sticker.ly packs and download stickers from a pack',
    usage: 'stickerpack <keyword> | stickerpack get <packId> [count]',
    cooldown: 8,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, prefix }) {
        const sub = (args[0] || '').toLowerCase();
        try {
            if (['get', 'download', 'dl'].includes(sub)) {
                const packId = args[1];
                const count = Math.max(1, Math.min(Number(args[2] || 8) || 8, 20));
                if (!packId) {
                    return await sock.sendMessage(from, { text: `❌ Usage: ${prefix}stickerpack get <packId> [count]` }, { quoted: message });
                }

                await sock.sendMessage(from, { react: { text: '⬇️', key: message.key } });
                const pack = await fetchPack(packId);
                if (!pack) throw new Error('Sticker pack not found');
                const resources = packResources(pack).slice(0, count);
                if (!resources.length) throw new Error('No stickers found in this pack');

                await sock.sendMessage(from, {
                    text: `📦 Downloading *${pack.name || pack.packId || packId}*\n👤 ${pack.authorName || pack.user?.userName || 'Unknown'}\n🔢 Sending ${resources.length} stickers...`
                }, { quoted: message });

                for (const url of resources) {
                    const stickerBuffer = await imageUrlToStickerBuffer(url, pack.name, pack.authorName || pack.user?.userName);
                    await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: message });
                }
                return await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
            }

            const keyword = args.join(' ').trim();
            await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });
            const packs = await searchPacks(keyword);
            if (!packs.length) throw new Error('No sticker packs found');

            const lines = packs.slice(0, 10).map((pack, i) => [
                `${i + 1}. *${pack.name || 'Untitled'}*`,
                `   🆔 ${pack.packId}`,
                `   👤 ${pack.authorName || pack.user?.userName || 'Unknown'} | 📦 ${pack.resourceFiles?.length || 0} stickers`,
                `   🔗 ${pack.shareUrl || ''}`
            ].join('\n'));

            await sock.sendMessage(from, {
                text: `🔎 *Sticker Pack Results for:* ${keyword}\n\n${lines.join('\n\n')}\n\nDownload: ${prefix}stickerpack get <packId> [count]`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } }).catch(() => {});
            return await sock.sendMessage(from, { text: `❌ Sticker pack failed: ${error.message}` }, { quoted: message });
        }
    }
};
