import { resolve } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { ROOT } from './constants.js';
import { resolveVersion, downloadUpstream } from './download.js';
import { wrapBinary } from './wrap.js';
import { stageInstall } from './stage.js';
import { packageDeb, packagePacman } from './packaging.js';
import { checkAndInstallPrereqs } from './prereqs.js';
import { log } from './log.js';

export interface BuildOptions {
  version?: string;
  pkg: 'deb' | 'pacman' | 'both';
  keepWork: boolean;
}

export interface BuildResult {
  version: string;
  debPath?: string;
  pacmanPath?: string;
}

async function cleanupBuild(version: string, keepWork: boolean) {
  const dirs = [
    resolve(ROOT, '.work', `opencode-${version}`),
    resolve(ROOT, 'third-party'),
    resolve(ROOT, 'artifacts'),
    resolve(ROOT, 'packaging', 'dpkg', 'work'),
    resolve(ROOT, 'packaging', 'pacman', 'pkg'),
    resolve(ROOT, 'packaging', 'pacman', 'src'),
  ];

  if (keepWork) {
    // keep only .work, clean everything else
    for (const d of dirs.slice(1)) {
      await rm(d, { recursive: true, force: true });
    }
    log('cleaned intermediate artifacts (kept .work)');
  } else {
    for (const d of dirs) {
      await rm(d, { recursive: true, force: true });
    }
    log('cleaned intermediate artifacts');
  }

  // remove any stray npm pack tarballs in the root
  const { readdir } = await import('node:fs/promises');
  try {
    const entries = await readdir(ROOT);
    for (const e of entries) {
      if (e.endsWith('.tgz')) {
        await rm(resolve(ROOT, e), { force: true });
      }
    }
  } catch {
    // ignore
  }
}

export async function build(opts: BuildOptions): Promise<string | undefined> {
  await checkAndInstallPrereqs();
  const version = await resolveVersion(opts.version);
  const workDir = resolve(ROOT, '.work', `opencode-${version}`);
  const runtimeDir = resolve(ROOT, 'artifacts', 'opencode', 'runtime');
  const runtimeOut = resolve(runtimeDir, 'opencode-termux');
  const loaderDir = resolve(ROOT, 'third-party', 'bun-termux-loader');

  log(`Building OpenCode v${version} for Termux (aarch64)`);

  await mkdir(workDir, { recursive: true });
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  const upstreamBin = await downloadUpstream(version, workDir);

  await mkdir(runtimeDir, { recursive: true });

  await wrapBinary(upstreamBin, runtimeOut, loaderDir);

  await stageInstall(runtimeOut);

  let debPath: string | undefined;
  let pacmanPath: string | undefined;

  if (opts.pkg === 'deb' || opts.pkg === 'both') {
    debPath = await packageDeb(version);
  }
  if (opts.pkg === 'pacman' || opts.pkg === 'both') {
    pacmanPath = await packagePacman(version);
  }

  await cleanupBuild(version, opts.keepWork);

  log(`Build complete: OpenCode v${version}`);
  if (debPath) log(`  deb: ${debPath}`);
  if (pacmanPath) log(`  pacman: ${pacmanPath}`);

  return debPath ?? pacmanPath;
}
