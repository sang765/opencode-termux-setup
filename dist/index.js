#!/usr/bin/env node
import { build } from './build.js';
import { install } from './install.js';
import { runFlow } from './flow.js';
import { run } from './run.js';
import { error as logError } from './log.js';
const DEBUG_FLAGS = new Set(['--version', '-v', '--pkg', '--install', '-i', '--keep', '-k', '--debug']);
function parseArgs(argv) {
    const args = { pkg: 'deb', install: false, keep: false, help: false, debug: false };
    let buildMode = false;
    const opencodeArgs = [];
    let afterSep = false;
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (afterSep) {
            opencodeArgs.push(a);
            continue;
        }
        if (a === '--') {
            afterSep = true;
            continue;
        }
        if (a === '--debug') {
            args.debug = true;
            continue;
        }
        if (DEBUG_FLAGS.has(a)) {
            buildMode = true;
        }
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
    return { args, opencodeArgs, buildMode };
}
function printHelp() {
    console.log(`
opencode-termux — OpenCode manager for Termux

Usage:
  pnpm dlx @sang765/opencode-termux-setup [options]
  npx -y @sang765/opencode-termux-setup [options]

Modes:
  (no flags)      Interactive: check version, update if needed, run opencode
  --debug         Verbose mode with full build logs
  --pkg <type>    Build mode: create .deb/.pacman package (implies --debug)

Options:
  -v, --version <ver>   Version to build (default: latest from npm)
  --pkg <type>          Package type: deb | pacman | both (default: deb)
  -i, --install         Install the .deb after building
  -k, --keep            Keep temporary work directory
  --debug               Show verbose build output
  -h, --help            Show this help

Examples:
  pnpm dlx @sang765/opencode-termux-setup              Interactive mode (fastest)
  npx -y @sang765/opencode-termux-setup                Interactive mode
  npx -y @sang765/opencode-termux-setup --debug        Verbose build logs
  npx -y @sang765/opencode-termux-setup --pkg deb      Build only

Note: --debug after the package name is for our tool.
      npx --debug ... is npx's own debug mode (use -y instead).
`);
}
async function main() {
    const { args, opencodeArgs, buildMode } = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }
    if (process.arch !== 'arm64') {
        logError('This tool is designed for Termux aarch64 (ARM64)');
        process.exit(1);
    }
    if (buildMode || args.debug) {
        // Verbose build mode
        const debPath = await build({
            version: args.version,
            pkg: args.pkg,
            keepWork: args.keep,
        });
        if (args.install && debPath) {
            await install(debPath);
        }
    }
    else if (opencodeArgs.length > 0) {
        // Args passed directly to opencode
        await run(opencodeArgs);
    }
    else {
        // Simple interactive mode
        await runFlow();
    }
}
main().catch((err) => {
    logError('Build failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
});
//# sourceMappingURL=index.js.map