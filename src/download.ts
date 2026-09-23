import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { info, warn, success, die } from './log.js';
import { V1, type Variant } from './variants.js';

export async function resolveVersion(ver?: string, variant: Variant = V1): Promise<string> {
  if (ver) return ver;
  const res = await fetch(`https://registry.npmjs.org/${variant.npmPkg}/latest`);
  if (!res.ok) die(`unable to resolve latest version from npm (HTTP ${res.status})`);
  const data = await res.json() as { version: string };
  const version = data.version;
  if (!version) die('unable to resolve latest version from npm');
  info(`resolved latest version: ${version}`);
  return version;
}

async function locateBinary(workDir: string): Promise<string> {
  for (const rel of ['package/bin/opencode', 'package/opencode', 'opencode', 'opencode-linux-arm64']) {
    const p = resolve(workDir, rel);
    if (existsSync(p)) return p;
  }
  const { stdout } = await execa('find', [workDir, '-maxdepth', '3', '-type', 'f', '(',
    '-name', 'opencode', '-o', '-name', 'opencode-*', ')', '-perm', '-u+x']);
  return stdout.split('\n')[0]?.trim() || '';
}

export async function downloadUpstream(version: string, workDir: string, variant: Variant = V1): Promise<string> {
  const binPath = resolve(workDir, 'package', 'bin', 'opencode');

  info(`downloading ${variant.npmPkg}@${version} from npm`);

  try {
    const metaRes = await fetch(`https://registry.npmjs.org/${variant.npmPkg}/${version}`);
    if (!metaRes.ok) throw new Error(`npm metadata HTTP ${metaRes.status}`);
    const meta = await metaRes.json() as { dist?: { tarball?: string } };
    const tarballUrl = meta.dist?.tarball;
    if (!tarballUrl) throw new Error('npm metadata missing dist.tarball');

    const npmTgz = resolve(workDir, `npm-${version}.tar.gz`);
    await execa('curl', ['-fL', tarballUrl, '-o', npmTgz], { cwd: workDir });
    await execa('tar', ['-xzf', npmTgz], { cwd: workDir });

    const candidate = await locateBinary(workDir);
    if (!candidate) throw new Error('binary not found in npm tarball');
    await mkdir(dirname(binPath), { recursive: true });
    if (candidate !== binPath) await execa('cp', [candidate, binPath]);

    success('downloaded upstream binary from npm');
    return binPath;
  } catch (npmErr) {
    warn('npm download failed, falling back to GitHub release');
    const relUrl = variant.releaseTarballUrl(version);
    const relTgz = resolve(workDir, `opencode-linux-arm64-rel-${version}.tar.gz`);

    await execa('curl', ['-fL', relUrl, '-o', relTgz], { cwd: workDir });
    await execa('tar', ['-xzf', relTgz], { cwd: workDir });

    const candidate = await locateBinary(workDir);
    if (!candidate) die('release tarball binary not found');
    await mkdir(dirname(binPath), { recursive: true });
    if (candidate !== binPath) await execa('cp', [candidate, binPath]);

    success('downloaded upstream binary from release tarball');
    return binPath;
  }
}

export async function resolveLoader(loaderDir: string): Promise<string> {
  if (existsSync(resolve(loaderDir, 'Makefile')) && existsSync(resolve(loaderDir, 'helper_scripts', 'replace_runtime.py'))) {
    info(`using existing bun-termux at ${loaderDir}`);
    return loaderDir;
  }

  info('cloning bun-termux');
  await rm(loaderDir, { recursive: true, force: true });
  await execa('git', [
    'clone', '--depth', '1',
    'https://github.com/Happ1ness-dev/bun-termux',
    loaderDir,
  ]);
  if (!existsSync(resolve(loaderDir, 'Makefile')) || !existsSync(resolve(loaderDir, 'helper_scripts', 'replace_runtime.py'))) {
    die('cloned bun-termux missing Makefile or replace_runtime.py');
  }
  success('cloned bun-termux');
  return loaderDir;
}
