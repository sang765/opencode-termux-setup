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

for pkg in glibc-repo glibc openssl-glibc
  check_installed $pkg; or set needs_install "$needs_install $pkg"
end

check_tool bun; or begin
  echo "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
end
check_tool git; or set needs_install "$needs_install git"
check_tool tar; or set needs_install "$needs_install tar"

if test -n "$needs_install"
  echo ""
  echo "Installing missing packages:$needs_install"

  if string match -q "* glibc-repo *" " $needs_install "
    echo "Installing glibc-repo first..."
    pkg update -y
    pkg install -y glibc-repo
    pkg update -y
  end

  set remaining ""
  for pkg in $needs_install
    if test "$pkg" != "glibc-repo"
      set remaining "$remaining $pkg"
    end
  end

  if test -n "$remaining"
    pkg install -y $remaining
  end
  echo ""
end

echo "All core dependencies satisfied."
echo ""
echo "All dependencies satisfied. Running full build pipeline..."
bunx -y github:sang765/opencode-termux-setup $argv
