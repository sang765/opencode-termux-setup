import { execa } from 'execa';
import { log } from './log.js';

export async function install(debPath: string): Promise<void> {
  log(`installing ${debPath}`);
  await execa('apt', ['install', '-y', debPath], { stdio: 'inherit' });
  const { stdout } = await execa('opencode', ['--version']);
  log(`installed opencode ${stdout.trim()}`);
}
