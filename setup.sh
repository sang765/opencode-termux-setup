#!/bin/sh
set -eu

check_installed() {
  if dpkg -s "$1" >/dev/null 2>&1; then
    echo "  ✓ $1 is already installed"
    return 0
  else
    echo "  ✗ $1 is not installed"
    return 1
  fi
}

check_tool() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "  ✓ $1 is already installed"
    return 0
  else
    echo "  ✗ $1 is not installed"
    return 1
  fi
}

needs_install=""

echo "Checking core dependencies..."

check_tool bun || { echo "Installing bun..."; curl -fsSL https://raw.githubusercontent.com/bd-loser/bun-termux/main/scripts/install.sh | bash; }
check_tool git || needs_install="$needs_install git"
check_tool tar || needs_install="$needs_install tar"

if [ -n "$needs_install" ]; then
  echo ""
  echo "Installing missing packages:$needs_install"
  # shellcheck disable=SC2086
  pkg install -y $needs_install
  echo ""
fi

echo "All core dependencies satisfied."

echo ""
echo "All dependencies satisfied. Running full build pipeline..."
bunx -y github:sang765/opencode-termux-setup "$@"
