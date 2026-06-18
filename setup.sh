#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

packages=(glibc-repo glibc openssl-glibc nodejs)

check_installed() {
  if dpkg -s "$1" &>/dev/null 2>&1; then
    echo "  ✓ $1 is already installed"
    return 0
  else
    echo "  ✗ $1 is not installed"
    return 1
  fi
}

check_tool() {
  if command -v "$1" &>/dev/null; then
    echo "  ✓ $1 is already installed"
    return 0
  else
    echo "  ✗ $1 is not installed"
    return 1
  fi
}

needs_install=()

echo "Checking core dependencies..."

for pkg in glibc-repo glibc openssl-glibc; do
  check_installed "$pkg" || needs_install+=("$pkg")
done

check_tool node || needs_install+=("nodejs")
check_tool npm || needs_install+=("nodejs")

check_tool pnpm || { echo "Installing pnpm..."; npm install -g pnpm; }

if [ ${#needs_install[@]} -gt 0 ]; then
  echo ""
  echo "Installing missing packages: ${needs_install[*]}"
  pkg update -y
  pkg install -y "${needs_install[@]}"
  echo ""
fi

echo "All core dependencies satisfied."

check_tool tar || { echo "Installing tar..."; pkg install -y tar; }

echo ""
echo "All dependencies satisfied. Running full build pipeline..."
npx -y github:sang765/opencode-termux-setup "$@"
