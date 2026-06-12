const PREFIX = '\x1b[36m[opencode-termux]\x1b[0m';

export let silent = false;

export function setSilent(v: boolean) {
  silent = v;
}

export function info(...msg: string[]) {
  if (!silent) console.error(`\x1b[34m${PREFIX}\x1b[0m`, ...msg);
}

export function warn(...msg: string[]) {
  if (!silent) console.error(`\x1b[33m${PREFIX}\x1b[0m \x1b[33mWARN\x1b[0m`, ...msg);
}

export function success(...msg: string[]) {
  if (!silent) console.error(`\x1b[32m${PREFIX}\x1b[0m`, ...msg);
}

export function error(...msg: string[]) {
  console.error(`\x1b[31m${PREFIX}\x1b[0m \x1b[31mERROR\x1b[0m`, ...msg);
}

export function die(...msg: string[]): never {
  error(...msg);
  process.exit(1);
}
