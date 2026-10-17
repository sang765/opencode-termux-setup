---
description: Update OpenCode V2 for Termux from the build pipeline
---

# Update OpenCode

Update the installed `opencode2` package with this repo's build pipeline.
Do **not** use OpenCode's built-in self-updater: it cannot recognise a
bun-termux wrapped binary, and if it ever succeeded it would overwrite the
wrapper with a plain Linux ARM64 binary that cannot run on Termux.

Run the V2 build flow:

```bash
bunx -y github:sang765/opencode-termux-setup#main --v2
```

That compares the installed `opencode2` against the latest
`@opencode/cli-linux-arm64` on npm, and when it is behind it rebuilds the
upstream binary, wraps it for Android and reinstalls the `.deb`. The build
directory is dropped unless `--keep` is passed, so every build is clean.

Then:

1. Confirm the result with `opencode2 --version` and report the version.
2. Tell the user to restart OpenCode (exit and launch `opencode2` again) so
   the freshly installed binary is picked up.
3. If npm was unreachable or the build failed, report the error verbatim
   instead of guessing.
