import './loadEnv.js';
import fs from 'fs-extra';
import path from 'path';

export const DEFAULT_BOT_IMAGE = 'https://i.ibb.co/sr8Jy29/69b07b2a6afd.png';
const PROFILE_FILE = path.join(process.cwd(), 'data', 'settings', 'bot-profile.json');

async function readProfileFile() {
    try {
        const data = await fs.readJSON(PROFILE_FILE);
        return data && typeof data === 'object' ? data : {};
    } catch {
        return {};
    }
}

function readProfileFileSync() {
    try {
        const data = fs.readJSONSync(PROFILE_FILE);
        return data && typeof data === 'object' ? data : {};
    } catch {
        return {};
    }
}

export async function getBotProfile() {
    const data = await readProfileFile();
    return {
        name: data.name || process.env.BOT_NAME || 'Asta Bot',
        image: data.image || DEFAULT_BOT_IMAGE
    };
}

export function getBotProfileSync() {
    const data = readProfileFileSync();
    return {
        name: data.name || process.env.BOT_NAME || 'Asta Bot',
        image: data.image || DEFAULT_BOT_IMAGE
    };
}

export async function updateBotProfile(patch = {}) {
    const current = await readProfileFile();
    const next = {
        ...current,
        ...(typeof patch.name === 'string' && patch.name.trim() ? { name: patch.name.trim() } : {}),
        ...(typeof patch.image === 'string' && patch.image.trim() ? { image: patch.image.trim() } : {}),
        updatedAt: new Date().toISOString()
    };
    await fs.ensureDir(path.dirname(PROFILE_FILE));
    await fs.writeJSON(PROFILE_FILE, next, { spaces: 2 });
    return next;
}
