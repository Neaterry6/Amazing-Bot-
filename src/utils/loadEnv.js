import fs from 'fs';
import path from 'path';

const ENV_FILE = path.resolve(process.cwd(), '.env');

function parseEnvLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;

    const idx = trimmed.indexOf('=');
    if (idx === -1) return null;

    const key = trimmed.slice(0, idx).trim();
    if (!key || process.env[key] !== undefined) return null;

    let value = trimmed.slice(idx + 1).trim();
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, '\n');
    return { key, value };
}

function loadEnvFromFile() {
    if (!fs.existsSync(ENV_FILE)) return;
    const content = fs.readFileSync(ENV_FILE, 'utf8');
    for (const line of content.split(/\r?\n/)) {
        const parsed = parseEnvLine(line);
        if (parsed) process.env[parsed.key] = parsed.value;
    }
}

loadEnvFromFile();

