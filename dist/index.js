#!/usr/bin/env node
import { build } from './build.js';
import { install } from './install.js';
function parseArgs(argv) {
    const args = { pkg: 'deb', install: false, keep: false, help: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        switch (a) {
            case '--version':
            case '-v':
                args.version = argv[++i];
                break;
            case '--pkg':
                args.pkg = argv[++i];
                break;
            case '--install':
            case '-i':
                args.install = true;
                break;
            case '--keep':
            case '-k':
                args.keep = true;
                break;
            case '--help':
            case '-h':
                args.help = true;
                break;
        }
    }
    return args;
}
function printHelp() {
    console.log(`
opencode-termux — build and install the latest OpenCode CLI for Termux

Usage:
  pnpm start [options]
  node dist/index.js [options]

Options:
  -v, --version <ver>   Version to build (default: latest from npm)
  --pkg <type>          Package type: deb | pacman | both (default: deb)
  -i, --install         Install the resulting .deb after building
  -k, --keep            Keep temporary work directory
  -h, --help            Show this help

Examples:
  pnpm start                          Build latest version as .deb
  pnpm start --pkg both               Build both .deb and .pacman
  pnpm start -v 1.17.4                Build specific version
  pnpm start -i                       Build and install
  pnpm start --pkg both -i            Build all packages and install
`);
}
async function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }
    if (process.arch !== 'arm64') {
        console.error('This tool is designed for Termux aarch64 (ARM64)');
        process.exit(1);
    }
    const debPath = await build({
        version: args.version,
        pkg: args.pkg,
        keepWork: args.keep,
    });
    if (args.install && debPath) {
        await install(debPath);
    }
}
main().catch((err) => {
    console.error('Build failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
});
//# sourceMappingURL=index.js.map