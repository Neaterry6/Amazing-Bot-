import axios from 'axios';

const HTTP = axios.create({
    timeout: 30000,
    maxRedirects: 5,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
});

const APK_MIME = 'application/vnd.android.package-archive';
const DEFAULT_MAX_APK_BYTES = Number(process.env.MAX_APK_DOWNLOAD_BYTES || 95 * 1024 * 1024);

function textOf(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) return textOf(value[0]);
    if (typeof value === 'object') {
        return value.name || value.en || value['en-US'] || value.default || Object.values(value).map(textOf).find(Boolean) || '';
    }
    return '';
}

function formatBytes(bytes = 0) {
    const n = Number(bytes) || 0;
    if (!n) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = n;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function safeName(value = 'app') {
    return String(value || 'app')
        .replace(/[^a-z0-9._ -]/gi, '_')
        .replace(/_+/g, '_')
        .slice(0, 80)
        .trim() || 'app';
}

function asArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.result)) return payload.result;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.apps)) return payload.apps;
    if (payload?.result && typeof payload.result === 'object') return [payload.result];
    if (payload?.data && typeof payload.data === 'object') return [payload.data];
    return [];
}

function pickDownloadUrl(item = {}) {
    const keys = ['download', 'downloadUrl', 'download_url', 'apkUrl', 'apk_url', 'url', 'link', 'file', 'path'];
    for (const key of keys) {
        const value = item[key];
        if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
    }
    for (const value of Object.values(item)) {
        if (value && typeof value === 'object') {
            const nested = pickDownloadUrl(value);
            if (nested) return nested;
        }
    }
    return '';
}

function normalizeApiItem(item = {}, source = 'API') {
    const name = textOf(item.name || item.title || item.appName || item.app || item.label);
    const packageName = textOf(item.package || item.packageName || item.package_name || item.id || item.appId || item.app_id);
    const developer = textOf(item.developer || item.dev || item.author || item.company);
    const version = textOf(item.version || item.versionName || item.version_name || item.latestVersion);
    const size = textOf(item.size || item.fileSize || item.filesize);
    const icon = textOf(item.icon || item.image || item.thumbnail || item.logo);
    const url = textOf(item.playstore || item.playStoreUrl || item.play_url || item.detail || item.href || item.link);
    const downloadUrl = pickDownloadUrl(item);
    return { name, packageName, developer, version, size, icon, url, downloadUrl, source, raw: item };
}

function normalizeAptoideItem(item = {}) {
    const file = item.file || {};
    return {
        name: textOf(item.name),
        packageName: textOf(item.package),
        developer: textOf(item.developer?.name || item.store?.name || item.developer),
        version: textOf(file.vername || file.version || item.version),
        size: formatBytes(file.filesize || item.size),
        icon: textOf(item.icon),
        url: item.package ? `https://en.aptoide.com/app/${item.package}` : '',
        downloadUrl: textOf(file.path || file.path_alt || item.downloadUrl || item.download_url),
        source: 'Aptoide',
        raw: item
    };
}

export async function searchAptoide(query, limit = 8) {
    const encoded = encodeURIComponent(String(query || '').trim());
    if (!encoded) return [];
    const url = `https://ws75.aptoide.com/api/7/apps/search/query=${encoded}/limit=${limit}`;
    const { data } = await HTTP.get(url);
    const list = data?.datalist?.list || data?.list || [];
    return list.map(normalizeAptoideItem).filter((item) => item.name || item.packageName || item.downloadUrl);
}

async function searchJsonApi(baseUrl, query, source, paramName = 'q') {
    const { data } = await HTTP.get(baseUrl, { params: { [paramName]: query } });
    return asArray(data).map((item) => normalizeApiItem(item, source)).filter((item) => item.name || item.packageName || item.downloadUrl);
}

export async function searchPlayStore(query) {
    const errors = [];

    const aptoide = await searchAptoide(query).catch((error) => {
        errors.push(`Aptoide: ${error.response?.status || error.message}`);
        return [];
    });
    if (aptoide.length) return aptoide;

    const providers = [
        ['https://api.siputzx.my.id/api/apk/playstore', 'Siputzx PlayStore', 'q'],
        ['https://arychauhann.onrender.com/api/playstore', 'Arya PlayStore', 'query'],
        ['https://appwisp.com/api/1.0/playstore/apps', 'AppWisp PlayStore', 'query']
    ];

    for (const [url, source, paramName] of providers) {
        try {
            const results = await searchJsonApi(url, query, source, paramName);
            if (results.length) return results;
        } catch (error) {
            errors.push(`${source}: ${error.response?.status || error.message}`);
        }
    }

    const fdroid = await searchFDroid(query).catch((error) => {
        errors.push(`F-Droid: ${error.response?.status || error.message}`);
        return [];
    });
    if (fdroid.length) return fdroid;

    const err = new Error(`No Play Store results found. ${errors.join('; ')}`.trim());
    err.providerErrors = errors;
    throw err;
}

export async function searchApk(query) {
    const errors = [];

    const aptoide = await searchAptoide(query).catch((error) => {
        errors.push(`Aptoide: ${error.response?.status || error.message}`);
        return [];
    });
    if (aptoide.some((item) => item.downloadUrl)) return aptoide.filter((item) => item.downloadUrl);
    if (aptoide.length) return aptoide;

    const providers = [
        ['https://api.siputzx.my.id/api/apk/openapk', 'Siputzx OpenAPK', 'q'],
        ['https://api.siputzx.my.id/api/apk/an1', 'Siputzx AN1', 'q']
    ];

    for (const [url, source, paramName] of providers) {
        try {
            const results = await searchJsonApi(url, query, source, paramName);
            const withDownloads = results.filter((item) => item.downloadUrl);
            if (withDownloads.length) return withDownloads;
            if (results.length) return results;
        } catch (error) {
            errors.push(`${source}: ${error.response?.status || error.message}`);
        }
    }

    const fdroid = await searchFDroid(query).catch((error) => {
        errors.push(`F-Droid: ${error.response?.status || error.message}`);
        return [];
    });
    if (fdroid.length) return fdroid;

    const err = new Error(`No APK results found. ${errors.join('; ')}`.trim());
    err.providerErrors = errors;
    throw err;
}

export async function searchFDroid(query) {
    const { data } = await HTTP.get('https://f-droid.org/repo/index-v2.json', { timeout: 45000 });
    const needle = String(query || '').toLowerCase();
    const packages = data?.packages || {};
    const results = [];

    for (const [packageName, pkg] of Object.entries(packages)) {
        const meta = pkg?.metadata || {};
        const name = textOf(meta.name) || packageName;
        const summary = textOf(meta.summary || meta.description);
        const haystack = `${name} ${packageName} ${summary}`.toLowerCase();
        if (!haystack.includes(needle)) continue;

        const versions = Object.values(pkg?.versions || {})
            .sort((a, b) => Number(b?.manifest?.versionCode || b?.versionCode || 0) - Number(a?.manifest?.versionCode || a?.versionCode || 0));
        const latest = versions[0] || {};
        const fileName = latest?.file?.name || latest?.file?.path || latest?.apkName || '';
        const downloadUrl = fileName
            ? `https://f-droid.org/repo/${String(fileName).replace(/^\/+/, '')}`
            : '';

        results.push({
            name,
            packageName,
            developer: textOf(meta.authorName || meta.authorEmail),
            version: textOf(latest?.manifest?.versionName || latest?.versionName),
            size: latest?.file?.size ? `${latest.file.size} bytes` : '',
            icon: meta.icon ? `https://f-droid.org/repo/${meta.icon.en || meta.icon['en-US'] || meta.icon}` : '',
            url: `https://f-droid.org/packages/${packageName}/`,
            downloadUrl,
            source: 'F-Droid',
            raw: latest
        });

        if (results.length >= 8) break;
    }

    return results;
}

export function formatAppList(results = [], prefix = '.', command = 'apk') {
    return results.slice(0, 8).map((app, index) => [
        `*${index + 1}. ${app.name || app.packageName || 'Unknown app'}*`,
        app.packageName ? `Package: ${app.packageName}` : null,
        app.developer ? `Developer: ${app.developer}` : null,
        app.version ? `Version: ${app.version}` : null,
        app.size ? `Size: ${app.size}` : null,
        app.source ? `Source: ${app.source}` : null,
        app.downloadUrl ? `Download: available` : `Download: not available`,
        `${prefix}${command} ${app.packageName || app.name || ''}`.trim()
    ].filter(Boolean).join('\n')).join('\n\n');
}

export function appCaption(app = {}) {
    return [
        `📦 *${app.name || app.packageName || 'Android App'}*`,
        app.packageName ? `Package: ${app.packageName}` : null,
        app.developer ? `Developer: ${app.developer}` : null,
        app.version ? `Version: ${app.version}` : null,
        app.size ? `Size: ${app.size}` : null,
        app.source ? `Source: ${app.source}` : null,
        app.url ? `Page: ${app.url}` : null,
        '',
        '⚠️ Install APKs only from sources you trust.'
    ].filter((line) => line !== null).join('\n');
}

export async function downloadApkBuffer(app, maxBytes = DEFAULT_MAX_APK_BYTES) {
    if (!app?.downloadUrl) throw new Error('No direct APK download link is available for this result.');

    const response = await HTTP.get(app.downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: maxBytes,
        maxBodyLength: maxBytes,
        headers: { Accept: `${APK_MIME},application/octet-stream,*/*` }
    });

    const buffer = Buffer.from(response.data);
    if (!buffer.length) throw new Error('Downloaded APK was empty.');
    if (buffer.length > maxBytes) throw new Error(`APK is too large (${Math.ceil(buffer.length / 1024 / 1024)} MB).`);
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        throw new Error('Downloaded file is not a valid APK archive.');
    }

    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    const disposition = String(response.headers['content-disposition'] || '');
    const headerName = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i)?.[1];
    const fileName = decodeURIComponent(headerName || `${safeName(app.name || app.packageName)}.apk`)
        .replace(/[^a-z0-9._ -]/gi, '_');

    return {
        buffer,
        fileName: fileName.toLowerCase().endsWith('.apk') ? fileName : `${fileName}.apk`,
        mimetype: contentType.includes('package-archive') ? contentType : APK_MIME,
        bytes: buffer.length
    };
}
