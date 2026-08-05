#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUN_RUNTIME="$SELF_DIR/../lib/bun/runtime/bun"

if [[ -x "$BUN_RUNTIME" ]]; then
  exec "$BUN_RUNTIME" "$@"
fi

echo "bun: no runtime found" >&2
exit 1
