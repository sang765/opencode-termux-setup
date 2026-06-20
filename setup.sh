#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

if [[ "${SHELL:-}" == *bash* ]] || [[ "$(ps -p $PPID -o comm= 2>/dev/null)" == *bash* ]]; then
  echo "  ⚠ Running in bash"
  echo "    Interactive prompts may not work. For a better experience,"
  echo "    run this script with fish, zsh, or foot."
  echo ""
fi

packages=(glibc-repo glibc openssl-glibc nodejs git tar)

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
check_tool git || needs_install+=("git")
check_tool tar || needs_install+=("tar")

check_tool pnpm || { echo "Installing pnpm..."; npm install -g pnpm; }

if [ ${#needs_install[@]} -gt 0 ]; then
  echo ""
  echo "Installing missing packages: ${needs_install[*]}"
  
  if [[ " ${needs_install[*]} " =~ " glibc-repo " ]]; then
    echo "Installing glibc-repo first..."
    pkg update -y
    pkg install -y glibc-repo
    pkg update -y
  fi

  remaining_packages=()
  for pkg in "${needs_install[@]}"; do
    if [ "$pkg" != "glibc-repo" ]; then
      remaining_packages+=("$pkg")
    fi
  done

  if [ ${#remaining_packages[@]} -gt 0 ]; then
    pkg install -y "${remaining_packages[@]}"
  fi
  echo ""
fi

echo "All core dependencies satisfied."

echo ""
echo "All dependencies satisfied. Running full build pipeline..."
npx -y github:sang765/opencode-termux-setup "$@"
