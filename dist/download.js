import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { info, warn, success, die } from './log.js';
const NPM_PKG = 'opencode-linux-arm64';
export async function resolveVersion(ver) {
    if (ver)
        return ver;
    const { stdout } = await execa('npm', ['view', NPM_PKG, 'version']);
    const version = stdout.trim();
    if (!version)
        die('unable to resolve latest version from npm');
    info(`resolved latest version: ${version}`);
    return version;
}
export async function downloadUpstream(version, workDir) {
    const binDir = resolve(workDir, 'package', 'bin');
    const binPath = resolve(binDir, 'opencode');
    info(`downloading ${NPM_PKG}@${version} from npm`);
    const tgz = `${NPM_PKG}-${version}.tgz`;
    try {
        await execa('npm', ['pack', `${NPM_PKG}@${version}`], { cwd: workDir });
        if (!existsSync(resolve(workDir, tgz)))
            throw new Error('npm pack did not produce expected tgz');
        await execa('tar', ['-xzf', tgz], { cwd: workDir });
        if (!existsSync(binPath))
            throw new Error('binary not found after extraction');
        success('downloaded upstream binary from npm');
        return binPath;
    }
    catch (npmErr) {
        warn('npm download failed, falling back to GitHub release');
        const ghUrl = `https://github.com/anomalyco/opencode/releases/download/v${version}/opencode-linux-arm64.tar.gz`;
        const ghTgz = resolve(workDir, `opencode-linux-arm64-gh-${version}.tar.gz`);
        await execa('curl', ['-fL', ghUrl, '-o', ghTgz], { cwd: workDir });
        await mkdir(binDir, { recursive: true });
        await execa('tar', ['-xzf', ghTgz], { cwd: workDir });
        let candidate = '';
        for (const name of ['opencode-linux-arm64', 'opencode']) {
            const p = resolve(workDir, name);
            if (existsSync(p)) {
                candidate = p;
                break;
            }
        }
        if (!candidate) {
            const { stdout } = await execa('find', [workDir, '-maxdepth', '3', '-type', 'f', '(',
                '-name', 'opencode', '-o', '-name', 'opencode-*', ')', '-perm', '-u+x']);
            candidate = stdout.split('\n')[0]?.trim() || '';
        }
        if (!candidate || !existsSync(candidate))
            die('GitHub release binary not found');
        await execa('cp', [candidate, binPath]);
        success('downloaded upstream binary from GitHub release');
        return binPath;
    }
}
export async function resolveLoader(loaderDir) {
    if (existsSync(resolve(loaderDir, 'Makefile')) && existsSync(resolve(loaderDir, 'replace_runtime.py'))) {
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
    if (!existsSync(resolve(loaderDir, 'Makefile')) || !existsSync(resolve(loaderDir, 'replace_runtime.py'))) {
        die('cloned bun-termux missing Makefile or replace_runtime.py');
    }
    success('cloned bun-termux');
    return loaderDir;
}
//# sourceMappingURL=download.js.map