import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const LOW_MENU_SONGS = [
    'short lofi chill instrumental',
    'soft anime lofi beat',
    'calm night drive lofi',
    'low volume relaxing lofi'
];

function findDownloadUrl(value) {
    if (!value) return '';
    if (typeof value === 'string') return /^https?:\/\//i.test(value) ? value : '';
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findDownloadUrl(item);
            if (found) return found;
        }
        return '';
    }
    if (typeof value !== 'object') return '';

    for (const key of ['downloadURL', 'download_url', 'download', 'audio', 'audioUrl', 'url', 'link', 'mp3']) {
        const found = findDownloadUrl(value[key]);
        if (found) return found;
    }
    for (const item of Object.values(value)) {
        const found = findDownloadUrl(item);
        if (found) return found;
    }
    return '';
}

async function getMenuSongUrl(query) {
    const endpoints = [
        `https://api.drexapp.space/downloader/ytplayv2?q=${encodeURIComponent(query)}`,
        `https://apis.davidcyril.name.ng/play?query=${encodeURIComponent(query)}&format=audio`
    ];

    for (const url of endpoints) {
        try {
            const { data } = await axios.get(url, {
                timeout: 25000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Asta-Bot)' }
            });
            const found = findDownloadUrl(data);
            if (found) return found;
        } catch {}
    }
    return '';
}

function compressAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .audioBitrate('48k')
            .audioChannels(1)
            .duration(45)
            .format('mp3')
            .outputOptions(['-map_metadata -1'])
            .on('end', resolve)
            .on('error', reject)
            .save(outputPath);
    });
}

export async function sendCompressedMenuSong(sock, from, message) {
    const song = LOW_MENU_SONGS[Math.floor(Math.random() * LOW_MENU_SONGS.length)];
    const tempDir = path.join(os.tmpdir(), 'asta-menu-audio');
    const stamp = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const inputPath = path.join(tempDir, `${stamp}_raw.audio`);
    const outputPath = path.join(tempDir, `${stamp}_low.mp3`);

    try {
        const audioUrl = await getMenuSongUrl(song);
        if (!audioUrl) return false;

        await fs.ensureDir(tempDir);
        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 90000,
            maxContentLength: 16 * 1024 * 1024,
            headers: { 'User-Agent': 'Mozilla/5.0 (Asta-Bot)' }
        });
        await fs.writeFile(inputPath, Buffer.from(response.data));
        await compressAudio(inputPath, outputPath);

        const audio = await fs.readFile(outputPath);
        if (!audio.length) return false;

        await sock.sendMessage(from, {
            audio,
            mimetype: 'audio/mpeg',
            fileName: 'asta-menu-low.mp3',
            ptt: false
        }, { quoted: message });
        return true;
    } catch (error) {
        console.error('Menu audio failed:', error.message);
        return false;
    } finally {
        await Promise.all([
            fs.remove(inputPath).catch(() => {}),
            fs.remove(outputPath).catch(() => {})
        ]);
    }
}
