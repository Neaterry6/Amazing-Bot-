import config from '../config.js';
import { normalizePhone } from './sessionControl.js';

function toDigits(value = '') {
    return normalizePhone(value);
}

function parseList(envValue = '') {
    return String(envValue || '')
        .split(',')
        .map((item) => toDigits(item))
        .filter(Boolean);
}

export function getTopOwnerNumbers() {
    const configuredTop = toDigits(process.env.TOP_OWNER_NUMBER || process.env.TOP_OWNER || '');
    const ownerNumbers = (config.ownerNumbers || []).map((x) => toDigits(x)).filter(Boolean);
    if (configuredTop) return [configuredTop, ...ownerNumbers.filter((n) => n !== configuredTop)];
    return ownerNumbers;
}

export function getPrimaryTopOwner() {
    return getTopOwnerNumbers()[0] || '';
}

export function getDeveloperNumbers() {
    const configuredDevelopers = parseList(process.env.DEVELOPER_NUMBERS || process.env.DEV_NUMBERS || '');
    const topOwners = getTopOwnerNumbers();
    return [...new Set([...topOwners, ...configuredDevelopers])];
}

export function isTopOwner(sender = '') {
    const digits = toDigits(sender);
    return !!digits && getTopOwnerNumbers().includes(digits);
}

export function isDeveloper(sender = '') {
    const digits = toDigits(sender);
    return !!digits && getDeveloperNumbers().includes(digits);
}

export function canUseSensitiveOwnerTools(sender = '') {
    return isTopOwner(sender) || isDeveloper(sender);
}
