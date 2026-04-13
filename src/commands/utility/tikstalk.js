import axios from 'axios';
import { createCanvas, loadImage } from '@napi-rs/canvas';

function formatNum(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '0';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function pickProfile(payload) {
    return payload?.data?.userInfo?.user
        || payload?.user
        || payload?.author
        || payload?.data?.author
        || null;
}

function pickStats(payload) {
    return payload?.data?.userInfo?.stats
        || payload?.stats
        || payload?.authorStats
        || payload?.data?.authorStats
        || {};
}

async function getTikTokProfile(username) {
    const clean = username.replace(/^@/, '').trim();
    const url = `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(clean)}`;
    const { data } = await axios.get(url, { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const user = pickProfile(data);
    const stats = pickStats(data);
    if (!user) throw new Error('User not found');
    return { clean, user, stats };
}

async function buildCard(profile) {
    const w = 1200;
    const h = 675;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#08111d';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#09c4ff';
    ctx.fillRect(0, 0, w, 75);
    ctx.fillStyle = '#00161f';
    ctx.font = 'bold 44px Sans';
    ctx.fillText('TIKTOK STALK REPORT', 340, 50);

    const avatarUrl = profile.user.avatarLarger || profile.user.avatarMedium || profile.user.avatarThumb;
    if (avatarUrl) {
        const avatarBuf = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 20000 });
        const avatar = await loadImage(Buffer.from(avatarBuf.data));
        ctx.save();
        ctx.beginPath();
        ctx.arc(130, 200, 95, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 35, 105, 190, 190);
        ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px Sans';
    ctx.fillText(profile.user.nickname || profile.clean, 260, 165);
    ctx.fillStyle = '#11d4ff';
    ctx.font = '36px Sans';
    ctx.fillText(`@${profile.user.uniqueId || profile.clean}`, 260, 215);

    const cards = [
        ['FOLLOWERS', formatNum(profile.stats.followerCount)],
        ['FOLLOWING', formatNum(profile.stats.followingCount)],
        ['HEARTS', formatNum(profile.stats.heartCount)],
        ['VIDEOS', formatNum(profile.stats.videoCount)]
    ];

    cards.forEach(([label, value], i) => {
        const x = 40 + i * 285;
        const y = 380;
        ctx.fillStyle = '#111a2a';
        ctx.fillRect(x, y, 255, 170);
        ctx.fillStyle = '#12d9ff';
        ctx.font = 'bold 54px Sans';
        ctx.fillText(value, x + 20, y + 75);
        ctx.fillStyle = '#7f8ca6';
        ctx.font = '30px Sans';
        ctx.fillText(label, x + 20, y + 130);
    });

    ctx.fillStyle = '#8ea1b8';
    ctx.font = '26px Sans';
    const bio = String(profile.user.signature || 'No bio').slice(0, 90);
    ctx.fillText(`BIO: ${bio}`, 40, 610);

    return canvas.toBuffer('image/png');
}

export default {
    name: 'tikstalk',
    aliases: ['ttstalk', 'tiktokstalk'],
    category: 'utility',
    description: 'Get TikTok profile report card image',
    usage: 'tikstalk <username>',
    example: 'tikstalk puzplespeedy',
    cooldown: 7,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const username = args.join(' ').trim();
            if (!username) {
                return await sock.sendMessage(from, { text: '❌ Usage: .tikstalk <username>' }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });
            const profile = await getTikTokProfile(username);
            const card = await buildCard(profile);

            await sock.sendMessage(from, {
                image: card,
                caption: `✅ TikTok report for @${profile.user.uniqueId || profile.clean}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (e) {
            await sock.sendMessage(from, {
                text: `❌ tikstalk failed: ${e.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
