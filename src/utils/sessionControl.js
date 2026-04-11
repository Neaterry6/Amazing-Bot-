import fs from 'fs-extra';
import path from 'path';
import config from '../config.js';

const STORE_FILE = path.join(process.cwd(), 'data', 'session-control.json');

function normalizeNumber(value = '') {
    const num = String(value || '')
        .replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '')
        .split(':')[0]
        .replace(/[^0-9]/g, '');
    return num.length >= 7 ? num : '';
}

function toJid(num) {
    const n = normalizeNumber(num);
    return n ? `${n}@s.whatsapp.net` : '';
}

function sessionIdFromSock(sock) {
    const id = sock?.user?.id || sock?.authState?.creds?.me?.id || '';
    const n = normalizeNumber(id);
    return n || 'default';
}

function getDefaultOwnerNumbers(sock) {
    const defaults = new Set((config.ownerNumbers || []).map(normalizeNumber).filter(Boolean));
    const botNum = sessionIdFromSock(sock);
    if (botNum) defaults.add(botNum);
    return [...defaults];
}

async function loadStore() {
    try {
        const data = await fs.readJSON(STORE_FILE);
        return data && typeof data === 'object' ? data : {};
    } catch {
        return {};
    }
}

async function saveStore(store) {
    await fs.ensureDir(path.dirname(STORE_FILE));
    await fs.writeJSON(STORE_FILE, store, { spaces: 2 });
}

export async function getSessionControl(sock) {
    const sid = sessionIdFromSock(sock);
    const store = await loadStore();
    const row = store[sid] || {};
    const owners = new Set([...(row.owners || []), ...getDefaultOwnerNumbers(sock)].map(normalizeNumber).filter(Boolean));
    const sudoers = new Set([...(row.sudoers || []), ...((config.sudoers || []).map(normalizeNumber).filter(Boolean))]);

    return {
        sessionId: sid,
        prefix: row.prefix || config.prefix,
        privateMode: row.privateMode === true,
        owners: [...owners],
        sudoers: [...sudoers]
    };
}

export async function updateSessionControl(sock, patch = {}) {
    const sid = sessionIdFromSock(sock);
    const store = await loadStore();
    const current = await getSessionControl(sock);
    const next = {
        prefix: typeof patch.prefix === 'string' && patch.prefix.trim() ? patch.prefix.trim() : current.prefix,
        privateMode: typeof patch.privateMode === 'boolean' ? patch.privateMode : current.privateMode,
        owners: Array.isArray(patch.owners) ? patch.owners.map(normalizeNumber).filter(Boolean) : current.owners,
        sudoers: Array.isArray(patch.sudoers) ? patch.sudoers.map(normalizeNumber).filter(Boolean) : current.sudoers
    };

    store[sid] = {
        ...store[sid],
        ...next,
        updatedAt: new Date().toISOString()
    };

    await saveStore(store);
    return await getSessionControl(sock);
}

export async function isOwnerForSession(sock, senderPhone = '') {
    const control = await getSessionControl(sock);
    const n = normalizeNumber(senderPhone);
    return !!(n && control.owners.includes(n));
}

export async function isSudoForSession(sock, senderPhone = '') {
    if (await isOwnerForSession(sock, senderPhone)) return true;
    const control = await getSessionControl(sock);
    const n = normalizeNumber(senderPhone);
    return !!(n && control.sudoers.includes(n));
}

export function normalizePhone(input = '') {
    return normalizeNumber(input);
}

export function toPhoneJid(input = '') {
    return toJid(input);
}
