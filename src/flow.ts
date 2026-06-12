import { execa, execaSync } from 'execa';
import { setSilent } from './log.js';
import { build } from './build.js';
import { install } from './install.js';
import { writeLn, write, select, Spinner } from './ui.js';

function getInstalledVersion(): string | null {
  try {
    const { stdout } = execaSync('opencode', ['--version']);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function getUpstreamVersion(): Promise<string> {
  const { stdout } = await execa('npm', ['view', 'opencode-linux-arm64', 'version']);
  return stdout.trim();
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

  // Logo
  writeLn(`  \x1b[90mOpen\x1b[97mCode\x1b[0m for \x1b[38;5;208mTermux\x1b[0m`);

  // Show version header
  writeLn(`  \x1b[90mInstalled\x1b[0m  \x1b[97m${installed ?? 'Not Installed'}\x1b[0m`);

  let upstream: string | null = null;
  try {
    upstream = await getUpstreamVersion();
    writeLn(`  \x1b[90mUpstream\x1b[0m  \x1b[97m${upstream}\x1b[0m`);
  } catch {
    writeLn(`  \x1b[90mUpstream\x1b[0m  \x1b[31mcould not check\x1b[0m`);
  }

  const needsUpdate = upstream && (!installed || isNewer(upstream, installed));

  if (needsUpdate) {
    writeLn('');
    writeLn(`  \x1b[33mNew version ${upstream} is available\x1b[0m`);
    writeLn('');

    const choice = await select([
      `Yes, update to ${upstream}`,
      'No, skip update',
    ]);

    writeLn('');

    if (choice === null) {
      writeLn(`  \x1b[90mexited\x1b[0m`);
      process.exit(0);
    }

    if (choice === 0) {
      writeLn(`  \x1b[36mUpdating to ${upstream}...\x1b[0m`);
      writeLn('');

      // Silence verbose logs during build
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

  // Launch opencode
  writeLn(`  \x1b[32m\u2713 Launching OpenCode\x1b[0m`);

  // Grab latest session ID before launching (if any exist)
  let beforeSession: string | null = null;
  try {
    const { stdout } = await execa('opencode', ['session', 'list']);
    const lines = stdout.trim().split('\n').filter(Boolean);
    if (lines.length > 2) {
      const cols = lines[lines.length - 1].trim().split(/\s{2,}/);
      beforeSession = cols[0] ?? null;
    }
  } catch {
    // no sessions yet
  }

  await execa('opencode', process.argv.slice(2), { stdio: 'inherit' });

  // After opencode exits, show session info
  try {
    const { stdout } = await execa('opencode', ['session', 'list']);
    const lines = stdout.trim().split('\n').filter(Boolean);
    if (lines.length > 2) {
      const cols = lines[lines.length - 1].trim().split(/\s{2,}/);
      const sessionId = cols[0];
      const title = cols[1] ?? `New session - ${new Date().toISOString()}`;
      if (sessionId && sessionId !== beforeSession) {
        writeLn('');
        writeLn(`  \x1b[90mSession\x1b[0m   \x1b[97m${title}\x1b[0m`);
        writeLn(`  \x1b[90mContinue\x1b[0m  \x1b[36mopencode -s ${sessionId}\x1b[0m`);
      }
    }
  } catch {
    // can't read session info
  }
}
