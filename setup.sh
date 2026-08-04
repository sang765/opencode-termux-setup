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

for pkg in glibc-repo glibc openssl-glibc; do
  check_installed "$pkg" || needs_install="$needs_install $pkg"
done

check_tool bun || { echo "Installing bun..."; curl -fsSL https://bun.sh/install | bash; }
check_tool git || needs_install="$needs_install git"
check_tool tar || needs_install="$needs_install tar"

if [ -n "$needs_install" ]; then
  echo ""
  echo "Installing missing packages:$needs_install"

  case " $needs_install " in
    *" glibc-repo "*)
      echo "Installing glibc-repo first..."
      pkg update -y
      pkg install -y glibc-repo
      pkg update -y
      ;;
  esac

  remaining=""
  for pkg in $needs_install; do
    if [ "$pkg" != "glibc-repo" ]; then
      remaining="$remaining $pkg"
    fi
  done

  if [ -n "$remaining" ]; then
    # shellcheck disable=SC2086
    pkg install -y $remaining
  fi
  echo ""
fi

echo "All core dependencies satisfied."

echo ""
echo "All dependencies satisfied. Running full build pipeline..."
bunx -y github:sang765/opencode-termux-setup "$@"
