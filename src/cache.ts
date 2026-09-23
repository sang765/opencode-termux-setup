import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import type { VariantId } from './variants.js';

const CACHE_DIR = resolve(homedir(), '.cache', 'opencode-termux');
const TTL = 60 * 60 * 1000; // 1 hour

function cacheFile(variant: VariantId): string {
  return resolve(CACHE_DIR, variant === 'v2' ? 'version-cache-v2.json' : 'version-cache.json');
}

interface Cache {
  version: string;
  timestamp: number;
}

export async function getCachedVersion(variant: VariantId = 'v1'): Promise<string | null> {
  try {
    const data = await readFile(cacheFile(variant), 'utf-8');
    const cache: Cache = JSON.parse(data);
    if (Date.now() - cache.timestamp < TTL) {
      return cache.version;
    }
  } catch {
    // no cache or invalid
  }
  return null;
}

export async function setCachedVersion(version: string, variant: VariantId = 'v1'): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const cache: Cache = { version, timestamp: Date.now() };
    await writeFile(cacheFile(variant), JSON.stringify(cache));
  } catch {
    // cache write is best-effort
  }
}
