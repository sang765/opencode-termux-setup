import { execa, execaSync } from 'execa';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { ROOT } from './constants.js';
import { build } from './build.js';
import { install } from './install.js';
import { info, warn, success, die } from './log.js';
import { V1, type Variant } from './variants.js';

function isInstalled(variant: Variant): boolean {
  try {
    execaSync('which', [variant.binName]);
    return true;
  } catch {
    return false;
  }
}

function getInstalledVersion(variant: Variant): string | null {
  try {
    const { stdout } = execaSync(variant.binName, ['--version']);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function getLatestVersion(variant: Variant): Promise<string> {
  const res = await fetch(`https://registry.npmjs.org/${variant.npmPkg}/latest`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { version: string };
  return data.version;
}

function askQuestion(query: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return Promise.resolve(true);
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === '' || a === 'y' || a === 'yes');
    });
  });
}

function parseMajorMinorPatch(v: string): number[] {
  return v.split('.').map(Number);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseMajorMinorPatch(latest);
  const c = parseMajorMinorPatch(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] ?? 0;
    const cv = c[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

export async function run(opencodeArgs: string[], variant: Variant = V1): Promise<void> {
  if (!isInstalled(variant)) {
    warn(`${variant.label} is not installed`);
    const ok = await askQuestion('Build and install the latest version? [Y/n] ');
    if (!ok) {
      info('aborted');
      return;
    }
    const debPath = await build({ version: undefined, pkg: 'deb', keepWork: false, variant: variant.id });
    if (debPath) await install(debPath, variant.binName);
  } else {
    const currentVer = getInstalledVersion(variant);
    info(`${variant.label} ${currentVer} is installed`);

    try {
      const latestVer = await getLatestVersion(variant);
      info(`latest upstream: ${latestVer}`);

      if (currentVer && isNewer(latestVer, currentVer)) {
        warn(`version ${latestVer} is available (you have ${currentVer})`);
        const ok = await askQuestion('Update to the latest version? [Y/n] ');
        if (ok) {
          const debPath = await build({ version: undefined, pkg: 'deb', keepWork: false, variant: variant.id });
          if (debPath) await install(debPath, variant.binName);
        } else {
          info('skipping update');
        }
      } else {
        success('you are on the latest version');
      }
    } catch {
      warn('could not check for updates (no network?)');
    }
  }

  info(`starting ${variant.binName}...`);
  try {
    await execa(variant.binName, opencodeArgs, { stdio: 'inherit' });
  } catch {
    // opencode handles its own exit codes
  }
}
