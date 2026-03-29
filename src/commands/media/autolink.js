import axios from 'axios';
import fs from 'fs-extra';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const groupSettings = new Map();
const downloadQueue = new Map();
const userDownloadLimits = new Map();

const supportedPlatforms = {
    youtube: /(?:youtube\.com|youtu\.be)\//i,
    facebook: /(?:facebook\.com|fb\.watch)\//i,
    instagram: /instagram\.com\/(?:p|reel)\//i,
    tiktok: /tiktok\.com\/.*\/video\//i,
    twitter: /(?:twitter\.com|x\.com)\/\w+\/status\//i
};

const HOURLY_LIMIT = 25;
const SETTINGS_FILE = path.join(__dirname, '../../cache/autolink_settings.json');

const ALLDL_APIS = [
    'https://dev-priyanshi.onrender.com/api/alldl?url=',
    'https://api.agatz.xyz/api/allDl?url=',
    'https://api.betabotz.eu.org/api/download/alldl?url='
];

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            Object.entries(data).forEach(([key, value]) => groupSettings.set(key, value));
        }
    } catch (error) {
        console.error('Error loading autolink settings:', error);
    }
}

function saveSettings() {
    try {
        const data = Object.fromEntries(groupSettings);
        fs.ensureDirSync(path.dirname(SETTINGS_FILE));
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving autolink settings:', error);
    }
}

function checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = userDownloadLimits.get(userId) || { count: 0, timestamp: now };

    if (now - userLimit.timestamp > 3600000) {
        userDownloadLimits.set(userId, { count: 1, timestamp: now });
        return true;
    }

    if (userLimit.count >= HOURLY_LIMIT) return false;
    userLimit.count++;
    userDownloadLimits.set(userId, userLimit);
    return true;
}

function extractValidUrls(text) {
    if (!text || typeof text !== 'string') return [];
    const baseRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(baseRegex) || [];
    return matches
        .map((url) => ({ url, platform: Object.entries(supportedPlatforms).find(([, re]) => re.test(url))?.[0] || 'unknown' }))
        .filter((x) => x.platform !== 'unknown');
}

async function getVideoData(url) {
    let lastError = null;

    for (const api of ALLDL_APIS) {
        try {
            const endpoint = `${api}${encodeURIComponent(url)}`;
            const response = await axios.get(endpoint, {
                timeout: 25000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const body = response.data || {};
            const data = body.data || body.result || body;

            const downloadUrl =
                data.high || data.low || data.url || data.video || data.download || data.hd || data.sd ||
                data?.links?.[0]?.url;

            if (!downloadUrl) throw new Error('No download URL found in API response');

            return {
                title: data.title || data.caption || 'Video',
                thumbnail: data.thumbnail || data.thumb || null,
                downloadUrl,
                quality: data.high || data.hd ? 'High' : 'Standard'
            };
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(`All free APIs failed. Last error: ${lastError?.message || 'Unknown'}`);
}

async function downloadVideo(videoData, chatId) {
    const videoPath = path.join(__dirname, `../../cache/temp_video_${chatId}_${Date.now()}.mp4`);
    fs.ensureDirSync(path.dirname(videoPath));

    const videoResponse = await axios({
        url: videoData.downloadUrl,
        method: 'GET',
        responseType: 'stream',
        timeout: 90000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const writer = fs.createWriteStream(videoPath);
    videoResponse.data.pipe(writer);

    return await new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(videoPath));
        writer.on('error', reject);
        videoResponse.data.on('error', reject);
        setTimeout(() => {
            writer.destroy(new Error('Download timeout'));
            reject(new Error('Download timeout'));
        }, 150000);
    });
}

loadSettings();

export default {
    name: 'autolink',
    aliases: ['autodl', 'autodownload'],
    category: 'media',
    description: 'Auto-download social links using free APIs',
    usage: 'autolink <on|off|status>',
    example: 'autolink on',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    groupOnly: true,

    async execute({ sock, message, args, from, sender, prefix, isGroupAdmin }) {
        if (!args?.length) {
            return await sock.sendMessage(from, {
                text:
                    `📱 *Autolink Commands*\n\n` +
                    `• ${prefix}autolink on\n` +
                    `• ${prefix}autolink off\n` +
                    `• ${prefix}autolink status\n\n` +
                    `Supported: ${Object.keys(supportedPlatforms).join(', ')}`
            }, { quoted: message });
        }

        const command = args[0].toLowerCase();

        if (command === 'status') {
            const isEnabled = groupSettings.get(from) || false;
            const limits = userDownloadLimits.get(sender) || { count: 0, timestamp: Date.now() };
            const resetAt = new Date(limits.timestamp + 3600000).toLocaleTimeString();

            return await sock.sendMessage(from, {
                text:
                    `📊 *Autolink Status*\n\n` +
                    `State: ${isEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `Your usage: ${limits.count}/${HOURLY_LIMIT}\n` +
                    `Resets: ${resetAt}`
            }, { quoted: message });
        }

        if (!['on', 'off'].includes(command)) {
            return await sock.sendMessage(from, {
                text: `⚠️ Use: ${prefix}autolink <on|off|status>`
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ Only group admins can change autolink settings.'
            }, { quoted: message });
        }

        groupSettings.set(from, command === 'on');
        saveSettings();

        return await sock.sendMessage(from, {
            text: command === 'on'
                ? '✅ Autolink enabled. Send supported links to auto-download.'
                : '❌ Autolink disabled.'
        }, { quoted: message });
    }
};

export async function handleAutoDownload(sock, message, from, sender, text) {
    const isEnabled = groupSettings.get(from);
    if (!isEnabled || !from.endsWith('@g.us')) return false;

    const urls = extractValidUrls(text);
    if (!urls.length) return false;

    if (!checkRateLimit(sender)) {
        const limits = userDownloadLimits.get(sender);
        const resetTime = new Date(limits.timestamp + 3600000).toLocaleTimeString();
        await sock.sendMessage(from, {
            text: `⚠️ Limit reached (${HOURLY_LIMIT}/hour). Try again at ${resetTime}.`
        }, { quoted: message });
        return true;
    }

    for (const { url, platform } of urls) {
        const threadQueue = downloadQueue.get(from) || new Set();
        if (threadQueue.has(url)) continue;

        threadQueue.add(url);
        downloadQueue.set(from, threadQueue);

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const videoData = await getVideoData(url);
            const videoPath = await downloadVideo(videoData, from);

            await sock.sendMessage(from, {
                video: { url: videoPath },
                caption:
                    `🎥 *Auto Downloaded*\n\n` +
                    `Platform: ${platform}\n` +
                    `Title: ${videoData.title}\n` +
                    `Quality: ${videoData.quality}\n\n` +
                    `Original: ${url}`,
                mimetype: 'video/mp4'
            }, { quoted: message });

            await fs.remove(videoPath).catch(() => {});
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(from, {
                text: `❌ Failed to download ${platform} link.\nReason: ${error.message}`
            }, { quoted: message });
        } finally {
            threadQueue.delete(url);
        }
    }

    return true;
}
