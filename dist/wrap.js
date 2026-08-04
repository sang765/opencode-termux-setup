import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveLoader } from './download.js';
import { info, success, die } from './log.js';
export async function wrapBinary(upstreamBin, runtimeOut, loaderDir) {
    const loaderPath = await resolveLoader(loaderDir);
    info('building libbun-android-fix.so');
    await execa('make', ['build'], { cwd: loaderPath });
    const shimSrc = resolve(loaderPath, 'dist', 'libbun-android-fix.so');
    if (!existsSync(shimSrc))
        die('libbun-android-fix.so not built');
    info('copying upstream binary for Termux/Android');
    await execa('cp', [upstreamBin, runtimeOut]);
    if (!existsSync(runtimeOut))
        die('binary not copied');
    await execa('chmod', ['755', runtimeOut]);
    info('runtime verification');
    const { stdout: fileInfo } = await execa('file', [runtimeOut]);
    info(fileInfo);
    success('runtime ready (using LD_PRELOAD shim)');
}
//# sourceMappingURL=wrap.js.map