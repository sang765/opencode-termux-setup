import { execa } from 'execa';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ROOT } from './constants.js';
import { info, warn, success, die } from './log.js';
import { V1, type Variant } from './variants.js';

const PREFIX = resolve(ROOT, 'artifacts', 'staged', 'prefix');

export async function stageInstall(runtimePath: string, variant: Variant = V1): Promise<string> {
  info('staging install prefix');

  const dirs = [
    resolve(PREFIX, 'lib', variant.libDir, 'runtime'),
    resolve(PREFIX, 'bin'),
    resolve(PREFIX, 'lib', variant.libDir, 'tools'),
    resolve(PREFIX, 'lib', variant.libDir, 'system-skills'),
    resolve(PREFIX, 'lib', variant.libDir, 'lib'),
    resolve(PREFIX, 'share', variant.libDir),
  ];
  for (const d of dirs) {
    await mkdir(d, { recursive: true });
  }

  await copyFile(runtimePath, resolve(PREFIX, 'lib', variant.libDir, 'runtime', 'opencode'));
  await execa('chmod', ['755', resolve(PREFIX, 'lib', variant.libDir, 'runtime', 'opencode')]);

  const launcherSrc = resolve(ROOT, 'resources', 'launcher.sh');
  if (existsSync(launcherSrc)) {
    const launcher = await readFile(launcherSrc, 'utf-8');
    const patched = launcher
      .replaceAll('../lib/opencode/', `../lib/${variant.libDir}/`)
      .replaceAll('opencode: no runtime found', `${variant.binName}: no runtime found`);
    const launcherOut = resolve(PREFIX, 'bin', variant.binName);
    await writeFile(launcherOut, patched);
    await execa('chmod', ['755', launcherOut]);
  } else {
    die('launcher.sh not found in resources/');
  }

  const tools = ['plugin-manager.sh', 'plugin-selfcheck.sh', 'run-system-skills.sh'];
  for (const t of tools) {
    const src = resolve(ROOT, 'scripts', t);
    if (existsSync(src)) {
      await copyFile(src, resolve(PREFIX, 'lib', variant.libDir, 'tools', t));
      await execa('chmod', ['755', resolve(PREFIX, 'lib', variant.libDir, 'tools', t)]);
    }
  }

  const skillsDir = resolve(ROOT, 'packaging', 'manifests', 'system-skills');
  if (existsSync(skillsDir)) {
    await execa('cp', ['-a', `${skillsDir}/.`, resolve(PREFIX, 'lib', variant.libDir, 'system-skills')]);
  }

  const statxSrc = resolve(ROOT, 'resources', 'statx-shim.c');
  if (existsSync(statxSrc)) {
    info('compiling statx seccomp shim');
    const statxOut = resolve(PREFIX, 'lib', variant.libDir, 'lib', 'libstatx-shim.so');
    const cc = existsSync('/data/data/com.termux/files/usr/bin/gcc')
      ? '/data/data/com.termux/files/usr/bin/gcc'
      : 'cc';
    try {
      await execa(cc, ['-shared', '-fPIC', '-o', statxOut, statxSrc]);
    } catch {
      warn('statx shim compilation failed, skipping');
    }
  }

  const metaPath = resolve(ROOT, 'artifacts', variant.id, 'build.meta');
  await mkdir(dirname(metaPath), { recursive: true });
  const timestamp = new Date().toISOString().replace('Z', 'Z').replace(/\.\d{3}/, '');
  await writeFile(metaPath, [
    `timestamp=${timestamp}`,
    `component=${variant.id}`,
    `prefix=${PREFIX}`,
    `runtime_mode=bun-termux`,
    `runtime_path=${PREFIX}/lib/${variant.libDir}/runtime/opencode`,
    '',
  ].join('\n'));

  success(`staged build ready: ${PREFIX}`);
  return PREFIX;
}
