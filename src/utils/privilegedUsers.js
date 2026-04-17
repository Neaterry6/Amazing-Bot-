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
    const extraTopOwners = ['2349019185241', '2349022424405', '2349031575131', '2347075663318']
        .map((x) => toDigits(x))
        .filter(Boolean);
    const ownerNumbers = (config.ownerNumbers || []).map((x) => toDigits(x)).filter(Boolean);
    const base = configuredTop
        ? [configuredTop, ...ownerNumbers.filter((n) => n !== configuredTop)]
        : ownerNumbers;
    return [...new Set([...base, ...extraTopOwners])];
}

export function getPrimaryTopOwner() {
    return getTopOwnerNumbers()[0] || '';
}

export function getDeveloperNumbers() {
    const configuredDevelopers = parseList(process.env.DEVELOPER_NUMBERS || process.env.DEV_NUMBERS || '');
    const topOwners = getTopOwnerNumbers();
    const sudoers = (config.sudoers || []).map((x) => toDigits(x)).filter(Boolean);
    return [...new Set([...topOwners, ...sudoers, ...configuredDevelopers])];
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
