import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT } from './constants.js';
import { log, die } from './log.js';

const PREFIX = '/data/data/com.termux/files/usr';
const STAGED_PREFIX = resolve(ROOT, 'artifacts', 'staged', 'prefix');

async function getVersion(): Promise<string> {
  const runtime = resolve(STAGED_PREFIX, 'lib', 'opencode', 'runtime', 'opencode');
  if (!existsSync(runtime)) die('staged runtime not found; run stage first');
  try {
    const { stdout } = await execa(runtime, ['--version']);
    return stdout.trim();
  } catch {
    return '0.0.0';
  }
}

export async function packageDeb(version?: string): Promise<string> {
  const ver = version ?? await getVersion();
  const arch = 'aarch64';
  const debRoot = resolve(ROOT, 'packaging', 'dpkg', 'work');
  const outDir = resolve(ROOT, 'packaging', 'dpkg');
  const outFile = resolve(outDir, `opencode_${ver}_${arch}.deb`);

  if (!existsSync(resolve(STAGED_PREFIX, 'lib', 'opencode', 'runtime', 'opencode'))) {
    die('missing staged runtime');
  }
  if (!existsSync(resolve(STAGED_PREFIX, 'bin', 'opencode'))) {
    die('missing staged launcher');
  }

  await rm(debRoot, { recursive: true, force: true });
  await mkdir(resolve(debRoot, 'DEBIAN'), { recursive: true });
  await mkdir(resolve(debRoot, PREFIX.slice(1)), { recursive: true });
  await execa('cp', ['-a', `${STAGED_PREFIX}/.`, resolve(debRoot, PREFIX.slice(1))]);

  const control = [
    'Package: opencode',
    `Version: ${ver}`,
    `Architecture: ${arch}`,
    'Maintainer: opencode-termux <opencode@termux.dev>',
    'Section: utils',
    'Priority: optional',
    'Description: OpenCode CLI for Termux (AI coding assistant)',
    'Depends: glibc, openssl-glibc, bash, ncurses',
    'Suggests: glibc-runner',
    '',
  ].join('\n');

  await writeFile(resolve(debRoot, 'DEBIAN', 'control'), control);

  const { stdout: size } = await execa('du', ['-sk', debRoot]);
  const installedSize = size.split('\t')[0];
  await writeFile(resolve(debRoot, 'DEBIAN', 'control'), control + `Installed-Size: ${installedSize}\n`);

  const postinst = `#!/data/data/com.termux/files/usr/bin/bash
set -e
echo "OpenCode for Termux installed (v${ver})"
echo "Run: opencode --version"
HOOK_RUNNER="/data/data/com.termux/files/usr/lib/opencode/tools/run-system-skills.sh"
if [[ -x "$HOOK_RUNNER" ]]; then
  OPENCODE_HOOK_STRICT=0 OPENCODE_HOOK_ENABLE_NETWORK=0 "$HOOK_RUNNER" post_install || true
fi
exit 0
`;

  await writeFile(resolve(debRoot, 'DEBIAN', 'postinst'), postinst);
  await execa('chmod', ['755', resolve(debRoot, 'DEBIAN', 'postinst')]);

  const prerm = `#!/data/data/com.termux/files/usr/bin/bash
set -e
HOOK_RUNNER="/data/data/com.termux/files/usr/lib/opencode/tools/run-system-skills.sh"
if [[ -x "$HOOK_RUNNER" ]]; then
  OPENCODE_HOOK_STRICT=0 OPENCODE_HOOK_ENABLE_NETWORK=0 "$HOOK_RUNNER" pre_remove || true
fi
exit 0
`;

  await writeFile(resolve(debRoot, 'DEBIAN', 'prerm'), prerm);
  await execa('chmod', ['755', resolve(debRoot, 'DEBIAN', 'prerm')]);

  const postrm = `#!/data/data/com.termux/files/usr/bin/bash
set -e
HOOK_RUNNER="/data/data/com.termux/files/usr/lib/opencode/tools/run-system-skills.sh"
if [[ -x "$HOOK_RUNNER" ]]; then
  OPENCODE_HOOK_STRICT=0 OPENCODE_HOOK_ENABLE_NETWORK=0 "$HOOK_RUNNER" post_remove || true
fi
exit 0
`;

  await writeFile(resolve(debRoot, 'DEBIAN', 'postrm'), postrm);
  await execa('chmod', ['755', resolve(debRoot, 'DEBIAN', 'postrm')]);
  await execa('chmod', ['755', resolve(debRoot, 'DEBIAN')]);
  await execa('chmod', ['755', debRoot]);

  await execa('dpkg-deb', ['--build', debRoot, outFile]);
  log(`DEB package created: ${outFile}`);
  return outFile;
}

export async function packagePacman(version?: string): Promise<string | undefined> {
  const ver = version ?? await getVersion();

  if (!existsSync('/data/data/com.termux/files/usr/bin/makepkg')) {
    log('pacman: makepkg not available, skipping');
    return undefined;
  }

  const pkgbuildDir = resolve(ROOT, 'packaging', 'pacman');
  const pkgbuild = resolve(pkgbuildDir, 'PKGBUILD');

  const template = `# Maintainer: opencode-termux <opencode@termux.dev>
pkgname=opencode
pkgver=${ver}
pkgrel=1
pkgdesc="OpenCode CLI for Termux (AI coding assistant)"
arch=(aarch64)
url="https://github.com/anomalyco/opencode"
license=('MIT')
depends=('glibc' 'openssl-glibc' 'bash' 'ncurses')
options=('!strip')

package() {
  cp -a "${STAGED_PREFIX}/." "\${pkgdir}/"
}
`;

  await writeFile(pkgbuild, template);

  try {
    await execa('makepkg', ['-C', '--noconfirm'], { cwd: pkgbuildDir });
    const { stdout } = await execa('ls', [resolve(pkgbuildDir, 'opencode-*.pkg.tar.*')]);
    const pkgFile = stdout.trim().split('\n')[0];
    log(`pacman package created: ${pkgFile}`);
    return pkgFile;
  } catch (err) {
    log('pacman packaging failed (keyring/config issue), skipping');
    return undefined;
  }
}
