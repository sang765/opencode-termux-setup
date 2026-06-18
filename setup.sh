#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

packages=(glibc-repo glibc openssl-glibc)

check_installed() {
  if dpkg -s "$1" &>/dev/null; then
    echo "  ✓ $1 is already installed"
    return 0
  else
    echo "  ✗ $1 is not installed"
    return 1
  fi
}

needs_install=()

echo "Checking dependencies..."

for pkg in "${packages[@]}"; do
  check_installed "$pkg" || needs_install+=("$pkg")
done

if command -v node &>/dev/null; then
  echo "  ✓ nodejs is already installed"
else
  echo "  ✗ nodejs is not installed"
  needs_install+=("nodejs")
fi

if [ ${#needs_install[@]} -eq 0 ]; then
  echo "All dependencies are satisfied."
  exit 0
fi

echo ""
echo "Installing missing packages: ${needs_install[*]}"
pkg update -y
pkg install -y "${needs_install[@]}"

echo ""
echo "Setup complete."
