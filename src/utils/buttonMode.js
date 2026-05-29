import fs from 'fs-extra';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data', 'settings', 'button_mode.json');

async function ensureStore() {
    await fs.ensureDir(path.dirname(FILE_PATH));
    if (!(await fs.pathExists(FILE_PATH))) {
        const defaultEnabled = String(process.env.BUTTON_MODE_DEFAULT || 'true').toLowerCase() !== 'false';
        await fs.writeJSON(FILE_PATH, { enabled: defaultEnabled, updatedAt: Date.now() }, { spaces: 2 });
    }
}

export async function getButtonMode() {
    await ensureStore();
    try {
        const data = await fs.readJSON(FILE_PATH);
        return data?.enabled === true;
    } catch {
        return String(process.env.BUTTON_MODE_DEFAULT || 'true').toLowerCase() !== 'false';
    }
}

export async function setButtonMode(enabled) {
    await ensureStore();
    const next = { enabled: !!enabled, updatedAt: Date.now() };
    await fs.writeJSON(FILE_PATH, next, { spaces: 2 });
    return next.enabled;
}
