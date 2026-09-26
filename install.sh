#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# IMPORTANT: Before running OpenCode, make sure you install all dependencies:
# - bun, glibc-repo, glibc, and openssl-glibc
#
# Install glibc dependencies with:
#   apt install -y glibc-repo && apt update && apt install -y glibc openssl-glibc
#
# For bun, I recommend using the build from this repository:
#   https://github.com/Happ1ness-dev/bun-termux
# Or download bun via the package I put in the release.

echo "IMPORTANT: Before running OpenCode, make sure you install all dependencies:"
echo "  - bun, glibc-repo, glibc, and openssl-glibc"
echo ""
echo "Install glibc dependencies with:"
echo "  apt install -y glibc-repo && apt update && apt install -y glibc openssl-glibc"
echo ""
echo "For bun, I recommend using the build from this repository:"
echo "  https://github.com/Happ1ness-dev/bun-termux"
echo "Or download bun via the package I put in the release."
echo ""

REPO="sang765/opencode-termux-setup"
DEB_PATTERN="opencode_.*_aarch64\\.deb"
STREAM="V1"
BIN_NAME="opencode"

usage() {
  cat <<EOF
Usage: install.sh [OPTIONS]

Install OpenCode for Termux from recent GitHub releases.

Options:
  --repo OWNER/REPO    GitHub repository to fetch from (default: $REPO)
  --v2, -2             Install the OpenCode V2 stream (default: V1)
  -h, --help           Show this help message
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:?--repo requires a value}"
      shift 2
      ;;
    --v2|-2)
      DEB_PATTERN="opencode2_.*_aarch64\\.deb"
      STREAM="V2"
      BIN_NAME="opencode2"
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required" >&2
  exit 1
fi

if ! command -v dpkg >/dev/null 2>&1; then
  echo "Error: dpkg is required. Install glibc first:" >&2
  echo "  apt install -y glibc-repo && apt update && apt install -y glibc openssl-glibc" >&2
  exit 1
fi

echo "Fetching releases from $REPO (stream: OpenCode $STREAM)..."
RELEASES_JSON=$(curl -fsSL "https://api.github.com/repos/$REPO/releases?per_page=100" 2>/dev/null) || {
  echo "Error: Could not fetch releases from $REPO" >&2
  echo "Make the repository and release exist." >&2
  exit 1
}

# Releases are newest-first; take the first one containing a matching .deb.
DEB_URL=$(echo "$RELEASES_JSON" | grep '"browser_download_url"' | grep -E "$DEB_PATTERN" | head -1 | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/') || true
if [[ -z "$DEB_URL" ]]; then
  echo "Error: No OpenCode $STREAM .deb file found in recent releases of $REPO" >&2
  exit 1
fi

# The release tag is embedded in the asset URL, so it matches the chosen .deb.
TAG=$(echo "$DEB_URL" | sed -n 's|.*/releases/download/\([^/]*\)/.*|\1|p')
if [[ -z "$TAG" ]]; then
  echo "Error: Could not determine release tag for $DEB_URL" >&2
  exit 1
fi

echo "Installing OpenCode $STREAM stream"
echo "Release: $TAG"

DEB_NAME=$(basename "$DEB_URL")
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading $DEB_NAME..."
curl -fL -o "$TMP_DIR/$DEB_NAME" "$DEB_URL"

echo "Installing $DEB_NAME..."
dpkg -i "$TMP_DIR/$DEB_NAME"

echo ""
echo "OpenCode $STREAM for Termux installed successfully!"
echo "Run: $BIN_NAME --version"
