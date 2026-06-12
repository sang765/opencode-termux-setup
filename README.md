# opencode-termux-setup

TypeScript build pipeline for [OpenCode](https://github.com/anomalyco/opencode) on **Termux (aarch64)**. Downloads the latest upstream ARM64 binary, wraps it for Android compatibility, and produces installable `.deb` packages.

## Prerequisites

- Termux on aarch64
- `pnpm` (`npm install -g pnpm`)

Missing tools are auto-installed via `apt` on first run.

## Usage

## Quick start (no clone needed)

```bash
npx github:sang765/opencode-termux-setup
```

This auto-clones, compiles, and runs the build for the latest OpenCode version.

## Local development

```bash
git clone https://github.com/sang765/opencode-termux-setup.git
cd opencode-termux-setup
pnpm install
pnpm start                  # build latest version as .deb
pnpm start --pkg both       # build both .deb and .pacman
pnpm start --pkg deb -i     # build and install
pnpm start -v 1.17.4        # build specific version
```

### Options

| Flag | Description |
|---|---|
| `-v, --version <ver>` | Version to build (default: latest from npm) |
| `--pkg <type>` | Package type: `deb`, `pacman`, or `both` (default: `deb`) |
| `-i, --install` | Install the resulting `.deb` after building |
| `-k, --keep` | Keep `.work/` directory for debugging |
| `-h, --help` | Show help |

## What it does

1. Resolves the latest `opencode-linux-arm64` version from npm
2. Downloads the upstream binary
3. Wraps it with [bun-termux-loader](https://github.com/Hope2333/bun-termux-loader) for Android compatibility (`/system/bin/linker64`)
4. Stages the install prefix (launcher, runtime, statx seccomp shim)
5. Builds a `.deb` package
6. Cleans up intermediate artifacts — only the `.deb` remains

## Output

```
packaging/dpkg/opencode_<version>_aarch64.deb
```

## Install the built package

```bash
apt install ./packaging/dpkg/opencode_1.17.4_aarch64.deb
opencode --version
```

## License

MIT
