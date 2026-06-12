import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
const CACHE_DIR = resolve(homedir(), '.cache', 'opencode-termux');
const CACHE_FILE = resolve(CACHE_DIR, 'version-cache.json');
const TTL = 60 * 60 * 1000; // 1 hour
export async function getCachedVersion() {
    try {
        const data = await readFile(CACHE_FILE, 'utf-8');
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
export async function setCachedVersion(version) {
    try {
        await mkdir(CACHE_DIR, { recursive: true });
        const cache = { version, timestamp: Date.now() };
        await writeFile(CACHE_FILE, JSON.stringify(cache));
    }
    catch {
        // cache write is best-effort
    }
}
//# sourceMappingURL=cache.js.map