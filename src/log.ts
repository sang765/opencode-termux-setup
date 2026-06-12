export function log(...msg: string[]) {
  console.error('[opencode-termux]', ...msg);
}

export function die(...msg: string[]): never {
  console.error('[opencode-termux] ERROR:', ...msg);
  process.exit(1);
}
