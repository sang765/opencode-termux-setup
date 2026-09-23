import { execa } from 'execa';
import { info, success } from './log.js';

export async function install(debPath: string, binName = 'opencode'): Promise<void> {
  info(`installing ${debPath}`);
  await execa('apt', ['install', '-y', '--allow-downgrades', debPath], { stdio: 'inherit' });
  const { stdout } = await execa(binName, ['--version']);
  success(`installed ${binName} ${stdout.trim()}`);
}
