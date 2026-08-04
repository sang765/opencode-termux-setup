#!/usr/bin/env fish

function check_installed
  if dpkg -s $argv[1] >/dev/null 2>&1
    echo "  ✓ $argv[1] is already installed"
    return 0
  else
    echo "  ✗ $argv[1] is not installed"
    return 1
  end
end

function check_tool
  if command -q $argv[1]
    echo "  ✓ $argv[1] is already installed"
    return 0
  else
    echo "  ✗ $argv[1] is not installed"
    return 1
  end
end

set needs_install ""

echo "Checking core dependencies..."

check_tool bun; or begin
  echo "Installing bun..."
  curl -fsSL https://raw.githubusercontent.com/bd-loser/bun-termux/main/scripts/install.sh | bash
end
check_tool git; or set needs_install "$needs_install git"
check_tool tar; or set needs_install "$needs_install tar"

if test -n "$needs_install"
  echo ""
  echo "Installing missing packages:$needs_install"
  pkg install -y $needs_install
  echo ""
end

echo "All core dependencies satisfied."
echo ""
echo "All dependencies satisfied. Running full build pipeline..."
bunx -y github:sang765/opencode-termux-setup $argv
