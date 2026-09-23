import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
const CACHE_DIR = resolve(homedir(), '.cache', 'opencode-termux');
const TTL = 60 * 60 * 1000; // 1 hour
function cacheFile(variant) {
    return resolve(CACHE_DIR, variant === 'v2' ? 'version-cache-v2.json' : 'version-cache.json');
}
export async function getCachedVersion(variant = 'v1') {
    try {
        const data = await readFile(cacheFile(variant), 'utf-8');
        const cache = JSON.parse(data);
        if (Date.now() - cache.timestamp < TTL) {
            return cache.version;
        }
    }
    catch {
        // no cache or invalid
    }
    return null;
}
export async function setCachedVersion(version, variant = 'v1') {
    try {
        await mkdir(CACHE_DIR, { recursive: true });
        const cache = { version, timestamp: Date.now() };
        await writeFile(cacheFile(variant), JSON.stringify(cache));
    }
    catch {
        // cache write is best-effort
    }
}
//# sourceMappingURL=cache.js.map