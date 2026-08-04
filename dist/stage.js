import { execa } from 'execa';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ROOT } from './constants.js';
import { info, warn, success, die } from './log.js';
const PREFIX = resolve(ROOT, 'artifacts', 'staged', 'prefix');
export async function stageInstall(runtimePath) {
    info('staging install prefix');
    const dirs = [
        resolve(PREFIX, 'lib', 'opencode', 'runtime'),
        resolve(PREFIX, 'bin'),
        resolve(PREFIX, 'lib', 'opencode', 'tools'),
        resolve(PREFIX, 'lib', 'opencode', 'system-skills'),
        resolve(PREFIX, 'lib', 'opencode', 'lib'),
        resolve(PREFIX, 'share', 'opencode'),
    ];
    for (const d of dirs) {
        await mkdir(d, { recursive: true });
    }
    await copyFile(runtimePath, resolve(PREFIX, 'lib', 'opencode', 'runtime', 'opencode'));
    await execa('chmod', ['755', resolve(PREFIX, 'lib', 'opencode', 'runtime', 'opencode')]);
    const launcherSrc = resolve(ROOT, 'resources', 'launcher.sh');
    if (existsSync(launcherSrc)) {
        await copyFile(launcherSrc, resolve(PREFIX, 'bin', 'opencode'));
        await execa('chmod', ['755', resolve(PREFIX, 'bin', 'opencode')]);
    }
    else {
        die('launcher.sh not found in resources/');
    }
    const tools = ['plugin-manager.sh', 'plugin-selfcheck.sh', 'run-system-skills.sh'];
    for (const t of tools) {
        const src = resolve(ROOT, 'scripts', t);
        if (existsSync(src)) {
            await copyFile(src, resolve(PREFIX, 'lib', 'opencode', 'tools', t));
            await execa('chmod', ['755', resolve(PREFIX, 'lib', 'opencode', 'tools', t)]);
        }
    }
    const skillsDir = resolve(ROOT, 'packaging', 'manifests', 'system-skills');
    if (existsSync(skillsDir)) {
        await execa('cp', ['-a', `${skillsDir}/.`, resolve(PREFIX, 'lib', 'opencode', 'system-skills')]);
    }
    const statxSrc = resolve(ROOT, 'resources', 'statx-shim.c');
    if (existsSync(statxSrc)) {
        info('compiling statx seccomp shim');
        const statxOut = resolve(PREFIX, 'lib', 'opencode', 'lib', 'libstatx-shim.so');
        const cc = existsSync('/data/data/com.termux/files/usr/bin/gcc')
            ? '/data/data/com.termux/files/usr/bin/gcc'
            : 'cc';
        try {
            await execa(cc, ['-shared', '-fPIC', '-o', statxOut, statxSrc]);
        }
        catch {
            warn('statx shim compilation failed, skipping');
        }
    }
    const metaPath = resolve(ROOT, 'artifacts', 'opencode', 'build.meta');
    await mkdir(dirname(metaPath), { recursive: true });
    const timestamp = new Date().toISOString().replace('Z', 'Z').replace(/\.\d{3}/, '');
    await writeFile(metaPath, [
        `timestamp=${timestamp}`,
        `component=opencode`,
        `prefix=${PREFIX}`,
        `runtime_mode=bun-termux`,
        `runtime_path=${PREFIX}/lib/opencode/runtime/opencode`,
        '',
    ].join('\n'));
    success(`staged build ready: ${PREFIX}`);
    return PREFIX;
}
//# sourceMappingURL=stage.js.map