import { execa, execaSync } from 'execa';
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setSilent } from './log.js';
import { build } from './build.js';
import { install } from './install.js';
import { writeLn, write, select, Spinner } from './ui.js';
import { getCachedVersion, setCachedVersion } from './cache.js';
import { ROOT } from './constants.js';

function getInstalledVersion(): string | null {
  try {
    const { stdout } = execaSync('opencode', ['--version']);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function fetchUpstreamVersion(): Promise<string> {
  const { stdout } = await execa('npm', ['view', 'opencode-linux-arm64', 'version']);
  const version = stdout.trim();
  await setCachedVersion(version);
  return version;
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

export async function runFlow() {
  const installed = getInstalledVersion();

  // Handle --version flag
  if (process.argv.slice(2).includes('--version')) {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
    writeLn(`\x1b[90mOpenCode\x1b[0m  \x1b[97m${installed ?? 'N/A'}\x1b[0m`);
    writeLn(`\x1b[90moctermux\x1b[0m  \x1b[97m${(pkg as { version: string }).version}\x1b[0m`);
    return;
  }

  // Show logo immediately
  writeLn(`  \x1b[90mOpen\x1b[97mCode\x1b[0m for \x1b[38;5;208mTermux\x1b[0m`);
  writeLn(`  \x1b[90mInstalled\x1b[0m  \x1b[97m${installed ?? 'Not Installed'}\x1b[0m`);

  // Start upstream version check in parallel while we show the UI
  const upstreamPromise = (async () => {
    const cached = await getCachedVersion();
    if (cached) return cached;
    return fetchUpstreamVersion();
  })();

  let upstream: string | null = null;
  try {
    upstream = await upstreamPromise;
    writeLn(`  \x1b[90mUpstream\x1b[0m  \x1b[97m${upstream}\x1b[0m`);
  } catch {
    writeLn(`  \x1b[90mUpstream\x1b[0m  \x1b[31mcould not check\x1b[0m`);
  }

  const needsUpdate = upstream && (!installed || isNewer(upstream, installed));

  if (needsUpdate) {
    writeLn('');
    writeLn(`  \x1b[33mNew version ${upstream} is available\x1b[0m`);
    writeLn('');

    let choice: number | null;
    if (!installed || !process.stdin.isTTY) {
      choice = 0;
    } else {
      choice = await select([
        `Yes, update to ${upstream}`,
        'No, skip update',
      ]);
    }

    writeLn('');

    if (choice === null) {
      writeLn(`  \x1b[90mexited\x1b[0m`);
      process.exit(0);
    }

    if (choice === 0) {
      writeLn(`  \x1b[36mUpdating to ${upstream}...\x1b[0m`);
      writeLn('');

      setSilent(true);

      const spinner = new Spinner('Building OpenCode');
      spinner.start();

      try {
        const debPath = await build({ version: undefined, pkg: 'deb', keepWork: false });
        spinner.succeed('Build complete');

        if (debPath) {
          const installSpinner = new Spinner('Installing package');
          installSpinner.start();
          await install(debPath);
          installSpinner.succeed('Install complete');
        }
      } catch (err) {
        spinner.fail('Build failed');
        writeLn(`  \x1b[31m${err instanceof Error ? err.message : String(err)}\x1b[0m`);
        process.exit(1);
      }

      setSilent(false);
    } else {
      writeLn(`  \x1b[90mskipped update\x1b[0m`);
    }
  } else if (installed && upstream) {
    writeLn('');
    writeLn(`  \x1b[32mYou're on the latest version\x1b[0m`);
  }

  writeLn('');

  // Install octermux alias if not present
  const homeDir = process.env.HOME || '/data/data/com.termux/files/home';
  const octermuxPath = resolve(homeDir, 'bin', 'octermux');
  if (!existsSync(octermuxPath)) {
    const scriptSrc = resolve(ROOT, 'resources', 'octermux.sh');
    if (existsSync(scriptSrc)) {
      await mkdir(resolve(homeDir, 'bin'), { recursive: true });
      await copyFile(scriptSrc, octermuxPath);
      await execa('chmod', ['755', octermuxPath]);
      writeLn(`  \x1b[90mAlias\x1b[0m    \x1b[1;36moctermux\x1b[0m \x1b[90m→\x1b[0m \x1b[97mrun '\x1b[1moctermux\x1b[0m\x1b[97m' to launch OpenCode\x1b[0m`);
    }
  }

  // Launch opencode
  writeLn(`  \x1b[32m\u2713 Launching OpenCode\x1b[0m`);

  await execa('opencode', process.argv.slice(2), { stdio: 'inherit' });
}
