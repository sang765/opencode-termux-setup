import { execa, execaSync } from 'execa';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { ROOT } from './constants.js';
import { build } from './build.js';
import { install } from './install.js';
import { info, warn, success, die } from './log.js';

function isInstalled(): boolean {
  try {
    execaSync('which', ['opencode']);
    return true;
  } catch {
    return false;
  }
}

function getInstalledVersion(): string | null {
  try {
    const { stdout } = execaSync('opencode', ['--version']);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function getLatestVersion(): Promise<string> {
  const { stdout } = await execa('npm', ['view', 'opencode-linux-arm64', 'version']);
  return stdout.trim();
}

function askQuestion(query: string): Promise<boolean> {
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

export async function run(opencodeArgs: string[]): Promise<void> {
  if (!isInstalled()) {
    warn('OpenCode is not installed');
    const ok = await askQuestion('Build and install the latest version? [Y/n] ');
    if (!ok) {
      info('aborted');
      return;
    }
    const debPath = await build({ version: undefined, pkg: 'deb', keepWork: false });
    if (debPath) await install(debPath);
  } else {
    const currentVer = getInstalledVersion();
    info(`OpenCode ${currentVer} is installed`);

    try {
      const latestVer = await getLatestVersion();
      info(`latest upstream: ${latestVer}`);

      if (currentVer && isNewer(latestVer, currentVer)) {
        warn(`version ${latestVer} is available (you have ${currentVer})`);
        const ok = await askQuestion('Update to the latest version? [Y/n] ');
        if (ok) {
          const debPath = await build({ version: undefined, pkg: 'deb', keepWork: false });
          if (debPath) await install(debPath);
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

  info('starting opencode...');
  try {
    await execa('opencode', opencodeArgs, { stdio: 'inherit' });
  } catch {
    // opencode handles its own exit codes
  }
}
