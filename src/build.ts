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

  if (!opts.keepWork) {
    await rm(workDir, { recursive: true, force: true });
    log('cleaned temporary work directory');
  }

  log(`Build complete: OpenCode v${version}`);
  if (debPath) log(`  deb: ${debPath}`);
  if (pacmanPath) log(`  pacman: ${pacmanPath}`);

  return debPath ?? pacmanPath;
}
