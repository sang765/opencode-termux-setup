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

REPO="sang765/opencode-termux-setup"
DEB_PATTERN="opencode_.*_aarch64\\.deb"

usage() {
  cat <<EOF
Usage: install.sh [OPTIONS]

Install OpenCode for Termux from the latest GitHub release.

Options:
  --repo OWNER/REPO    GitHub repository to fetch from (default: $REPO)
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

echo "Fetching latest release from $REPO..."
RELEASE_JSON=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null) || {
  echo "Error: Could not fetch release from $REPO" >&2
  echo "Make the repository and release exist." >&2
  exit 1
}

TAG=$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
if [[ -z "$TAG" ]]; then
  echo "Error: No release found" >&2
  exit 1
fi

echo "Latest release: $TAG"

DEB_URL=$(echo "$RELEASE_JSON" | grep '"browser_download_url"' | grep -E "$DEB_PATTERN" | head -1 | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/')
if [[ -z "$DEB_URL" ]]; then
  echo "Error: No .deb file found in release $TAG" >&2
  exit 1
fi

DEB_NAME=$(basename "$DEB_URL")
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading $DEB_NAME..."
curl -fL -o "$TMP_DIR/$DEB_NAME" "$DEB_URL"

echo "Installing $DEB_NAME..."
dpkg -i "$TMP_DIR/$DEB_NAME"

echo ""
echo "OpenCode for Termux installed successfully!"
echo "Run: opencode --version"
