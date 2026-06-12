import { execa, execaSync } from 'execa';
import { log, die } from './log.js';

interface Prereq {
  name: string;
  check: string;
  pkg?: string;
  aptPkg?: string;
  optional?: boolean;
}

const PREREQS: Prereq[] = [
  { name: 'npm', check: 'npm --version', pkg: 'nodejs' },
  { name: 'tar', check: 'tar --version', pkg: 'tar' },
  { name: 'file', check: 'file --version', pkg: 'file' },
  { name: 'python3', check: 'python3 --version', pkg: 'python' },
  { name: 'git', check: 'git --version', pkg: 'git' },
  { name: 'dpkg-deb', check: 'dpkg-deb --version', pkg: 'dpkg' },
  { name: 'gcc (or cc)', check: 'gcc --version || cc --version', aptPkg: 'gcc', optional: true },
  { name: 'curl', check: 'curl --version', pkg: 'curl', optional: true },
];

function found(cmd: string): boolean {
  try {
    execaSync('sh', ['-c', cmd]);
    return true;
  } catch {
    return false;
  }
}

export async function checkAndInstallPrereqs(): Promise<void> {
  const missing: Prereq[] = [];

  for (const prereq of PREREQS) {
    if (!found(prereq.check)) {
      missing.push(prereq);
    }
  }

  const required = missing.filter(p => !p.optional);
  if (required.length === 0) {
    log('all required prerequisites found');
    if (missing.length > 0) {
      log(`optional prerequisites missing: ${missing.map(p => p.name).join(', ')}`);
    }
    return;
  }

  log(`missing required tools: ${required.map(p => p.name).join(', ')}`);

  // Check if apt is available
  if (!found('apt --version')) {
    die('apt not available — install missing tools manually');
  }

  // Build install command
  const packages = required
    .map(p => p.aptPkg ?? p.pkg)
    .filter((p): p is string => !!p);
  const uniquePkgs = [...new Set(packages)];

  log(`installing: ${uniquePkgs.join(', ')}`);
  await execa('apt', ['install', '-y', ...uniquePkgs], { stdio: 'inherit' });

  // Verify installations
  for (const prereq of required) {
    if (!found(prereq.check)) {
      die(`${prereq.name} still not found after install attempt`);
    }
  }

  log('all prerequisites satisfied');
}
