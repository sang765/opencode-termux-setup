#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# ============================================================================
# OpenCode for Termux - Enhanced Installer
# Works both when run directly AND when piped from curl
#
# Requirements:
#   - glibc packages: pkg install -y glibc-repo && pkg update && pkg install -y glibc openssl-glibc
#   - bun runtime: curl -fsSL https://bun.sh/install | bash
# ============================================================================

REPO="sang765/opencode-termux-setup"
DEB_PATTERN="opencode_.*_aarch64\\.deb"
VERSION=""

# Detect if we're being piped from curl
IS_PIPED=0
if [[ ! -t 0 && ! -t 1 ]]; then
  IS_PIPED=1
fi

# Colors: enable for terminals, disable when piped
# When piped from curl, we still show colors since most terminals handle them
if [[ -t 1 ]] || [[ "$IS_PIPED" == "1" ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' BOLD='' NC=''
fi

# ============================================================================
# Output Helpers
# ============================================================================

log_info()    { echo -e "${BLUE}[opencode]${NC} $*"; }
log_success() { echo -e "${GREEN}[opencode]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[opencode]${NC} $*" >&2; }
log_error()   { echo -e "${RED}[opencode]${NC} $*" >&2; }

log_verbose() {
  if [[ "${VERBOSE:-0}" == "1" ]]; then
    echo -e "${BLUE}[opencode:debug]${NC} $*"
  fi
}

log_quiet() {
  if [[ "${QUIET:-0}" != "1" ]]; then
    echo -e "$*"
  fi
}

# ============================================================================
# Spinner
# ============================================================================

spinner() {
  local pid=$1
  local message=$2
  local delay=0.1
  local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

  # When piped or quiet, skip animation and wait silently
  if [[ "$IS_PIPED" == "1" ]] || [[ "${QUIET:-0}" == "1" ]]; then
    wait "$pid" 2>/dev/null
    return $?
  fi

  # Animated spinner for interactive terminals
  while kill -0 "$pid" 2>/dev/null; do
    for (( i=0; i<${#spinstr}; i++ )); do
      printf "\r${BLUE}[opencode]${NC} ${spinstr:$i:1} %s" "$message"
      sleep $delay
      spinstr="${spinstr:$i+1}${spinstr:0:$i+1}"
    done
  done
  printf "\r${BLUE}[opencode]${NC} ✓ %s\n" "$message"
}

# ============================================================================
# Utility Functions
# ============================================================================

check_installed() {
  dpkg -s opencode >/dev/null 2>&1
}

get_installed_version() {
  if check_installed; then
    dpkg -s opencode 2>/dev/null | grep -i "^Version:" | head -1 | awk '{print $2}' | sed 's/-.*//' || echo ""
  else
    echo ""
  fi
}

check_network() {
  log_verbose "Checking network connectivity..."
  if ! curl -fsSL --max-time 10 "https://api.github.com" >/dev/null 2>&1; then
    log_error "No network connectivity. Please check your internet connection."
    exit 1
  fi
  log_verbose "Network OK"
}

check_disk_space() {
  local required_mb=${1:-50}
  local available_mb
  available_mb=$(df -m "${TMPDIR:-/tmp}" 2>/dev/null | awk 'NR==2{print $4}' || echo "0")
  if [[ "$available_mb" -lt "$required_mb" ]]; then
    log_error "Insufficient disk space. Need ${required_mb}MB, have ${available_mb}MB available."
    exit 1
  fi
  log_verbose "Disk space OK: ${available_mb}MB available"
}

check_arch() {
  local arch
  arch=$(uname -m)
  if [[ "$arch" != "aarch64" ]]; then
    log_warn "Architecture is '$arch', expected 'aarch64'. This package is built for ARM64 devices."
    return 1
  fi
  return 0
}

check_termux() {
  if [[ ! -d "/data/data/com.termux" ]]; then
    log_warn "This doesn't appear to be a Termux environment. Proceeding anyway..."
    return 1
  fi
  return 0
}

compare_versions() {
  local v1=${1#v}  # Strip leading 'v'
  local v2=${2#v}  # Strip leading 'v'
  # Returns 0 if equal, 1 if v1 > v2, 2 if v1 < v2
  if [[ "$v1" == "$v2" ]]; then
    return 0
  fi
  local IFS=.
  local i v1_parts=($v1) v2_parts=($v2)
  for ((i=0; i<${#v1_parts[@]}; i++)); do
    local p1="${v1_parts[i]:-0}"
    local p2="${v2_parts[i]:-0}"
    if ((10#$p1 > 10#$p2)); then
      return 1
    fi
    if ((10#$p1 < 10#$p2)); then
      return 2
    fi
  done
  if [[ ${#v1_parts[@]} -lt ${#v2_parts[@]} ]]; then
    return 2
  fi
  return 0
}

# JSON parsing: use jq if available, fallback to grep/sed
parse_json_field() {
  local json=$1
  local field=$2
  if command -v jq >/dev/null 2>&1; then
    echo "$json" | jq -r ".$field" 2>/dev/null
  else
    echo "$json" | grep "\"$field\"" | head -1 | sed "s/.*\"$field\": *\"\([^\"]*\)\".*/\1/"
  fi
}

parse_json_array_field() {
  local json=$1
  local field=$2
  local pattern=${3:-}
  if command -v jq >/dev/null 2>&1; then
    if [[ -n "$pattern" ]]; then
      echo "$json" | jq -r ".$field[] | select(. | test(\"$pattern\"))" 2>/dev/null | head -1
    else
      echo "$json" | jq -r ".$field[0]" 2>/dev/null
    fi
  else
    # Fallback: grep for browser_download_url with the pattern
    if [[ -n "$pattern" ]]; then
      echo "$json" | grep "browser_download_url" | grep -E "$pattern" | head -1 | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/'
    else
      echo "$json" | grep "browser_download_url" | head -1 | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/'
    fi
  fi
}

# ============================================================================
# Uninstall
# ============================================================================

do_uninstall() {
  if ! check_installed; then
    log_warn "OpenCode is not installed. Nothing to uninstall."
    exit 0
  fi

  local version
  version=$(get_installed_version)
  log_info "Uninstalling OpenCode $version..."

  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    log_info "[dry-run] Would run: dpkg -r opencode"
    exit 0
  fi

  dpkg -r opencode
  log_success "OpenCode uninstalled successfully."
  exit 0
}

# ============================================================================
# Usage
# ============================================================================

usage() {
  cat <<EOF
${BOLD}OpenCode for Termux - Installer${NC}

Usage: install.sh [OPTIONS]

Install OpenCode for Termux from the latest GitHub release.

Options:
  --repo OWNER/REPO    GitHub repository to fetch from (default: $REPO)
  --version <ver>      Install a specific version (e.g., 1.17.4)
  --force              Reinstall even if same version is installed
  --dry-run            Show what would be done without installing
  --quiet              Suppress non-error output
  --verbose            Show detailed debug output
  --skip-deps          Skip dependency checks
  --uninstall          Remove OpenCode
  --log <file>         Log output to file
  -h, --help           Show this help message

Examples:
  install.sh                    # Install latest version
  install.sh --version 1.17.4   # Install specific version
  install.sh --force            # Reinstall current/latest version
  install.sh --dry-run          # Preview without installing
  install.sh --uninstall        # Remove OpenCode
EOF
  exit 0
}

# ============================================================================
# Main
# ============================================================================

main() {
  local DRY_RUN=0
  local FORCE=0
  local QUIET=0
  local VERBOSE=0
  local SKIP_DEPS=0
  local UNINSTALL=0
  local LOG_FILE=""

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)
        REPO="${2:?--repo requires a value}"
        shift 2
        ;;
      --version)
        VERSION="${2:?--version requires a value}"
        shift 2
        ;;
      --force)
        FORCE=1
        shift
        ;;
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      --quiet)
        QUIET=1
        shift
        ;;
      --verbose)
        VERBOSE=1
        shift
        ;;
      --skip-deps)
        SKIP_DEPS=1
        shift
        ;;
      --uninstall)
        UNINSTALL=1
        shift
        ;;
      --log)
        LOG_FILE="${2:?--log requires a value}"
        shift 2
        ;;
      -h|--help)
        usage
        ;;
      *)
        log_error "Unknown option: $1"
        echo "Run 'install.sh --help' for usage information." >&2
        exit 1
        ;;
    esac
  done

  export VERBOSE QUIET DRY_RUN

  # Setup logging if requested
  if [[ -n "$LOG_FILE" ]]; then
    exec > >(tee -a "$LOG_FILE") 2>&1
    log_info "Logging to: $LOG_FILE"
  fi

  echo ""
  echo -e "${BOLD}  OpenCode for Termux${NC}"
  echo ""
  echo -e "${YELLOW}  IMPORTANT: Before running OpenCode, make sure you install all dependencies:${NC}"
  echo -e "${YELLOW}  - bun, glibc-repo, glibc, and openssl-glibc${NC}"
  echo ""
  echo -e "${YELLOW}  Install glibc dependencies with:${NC}"
  echo -e "${YELLOW}    apt install -y glibc-repo && apt update && apt install -y glibc openssl-glibc${NC}"
  echo ""
  echo -e "${YELLOW}  For bun, I recommend using the build from this repository:${NC}"
  echo -e "${YELLOW}    https://github.com/Happ1ness-dev/bun-termux${NC}"
  echo -e "${YELLOW}  Or download bun via the package I put in the release.${NC}"
  echo ""

  # Handle uninstall
  if [[ "$UNINSTALL" == "1" ]]; then
    do_uninstall
  fi

  # Environment checks
  if [[ "$SKIP_DEPS" != "1" ]]; then
    check_termux
    check_arch || log_warn "Continuing despite architecture mismatch..."
  fi

  # Check dependencies
  log_info "Checking dependencies..."

  if ! command -v curl >/dev/null 2>&1; then
    log_error "curl is required. Install it with: pkg install curl"
    exit 1
  fi
  log_verbose "curl: OK"

  if ! command -v dpkg >/dev/null 2>&1; then
    log_error "dpkg is required. Install glibc first:"
    echo "  apt install -y glibc-repo && apt update && apt install -y glibc openssl-glibc" >&2
    exit 1
  fi
  log_verbose "dpkg: OK"

  if command -v jq >/dev/null 2>&1; then
    log_verbose "jq: OK (using enhanced JSON parser)"
  else
    log_verbose "jq: Not found (using fallback parser)"
  fi

  if [[ "$SKIP_DEPS" != "1" ]]; then
    check_network
    check_disk_space 50
  fi

  # Version checking
  local INSTALLED_VERSION=""
  if check_installed; then
    INSTALLED_VERSION=$(get_installed_version)
    log_info "Installed version: ${BOLD}$INSTALLED_VERSION${NC}"
  else
    INSTALLED_VERSION=""
    log_info "Installed version: Not installed"
  fi

  # Fetch release info
  log_info "Fetching release info from ${BOLD}$REPO${NC}..."

  local RELEASE_JSON
  local RELEASE_URL

  if [[ -n "$VERSION" ]]; then
    # Fetch specific version release
    RELEASE_URL="https://api.github.com/repos/$REPO/releases/tags/v$VERSION"
    log_verbose "Fetching release for version $VERSION..."
  else
    # Fetch latest release
    RELEASE_URL="https://api.github.com/repos/$REPO/releases/latest"
  fi

  RELEASE_JSON=$(curl -fsSL "$RELEASE_URL" 2>/dev/null) || {
    log_error "Could not fetch release from $REPO"
    if [[ -n "$VERSION" ]]; then
      log_error "Version $VERSION may not exist. Check available releases at:"
      log_error "  https://github.com/$REPO/releases"
    else
      log_error "Make sure the repository and release exist."
    fi
    exit 1
  }

  local TAG
  TAG=$(parse_json_field "$RELEASE_JSON" "tag_name")
  if [[ -z "$TAG" || "$TAG" == "null" ]]; then
    log_error "No release found"
    exit 1
  fi

  # Use specified version or latest
  local TARGET_VERSION="${VERSION:-$TAG}"
  log_info "Target version:    ${BOLD}$TARGET_VERSION${NC}"

  # Version comparison
  if [[ -n "$INSTALLED_VERSION" && "$FORCE" != "1" ]]; then
    local cmp_result=0
    compare_versions "$INSTALLED_VERSION" "$TARGET_VERSION" || cmp_result=$?
    if [[ $cmp_result -eq 0 ]]; then
      echo ""
      log_success "Already installed and up-to-date!"
      echo ""
      log_info "Run: ${BOLD}opencode --version${NC}"
      exit 0
    elif [[ $cmp_result -eq 1 ]]; then
      echo ""
      log_warn "Installed version ($INSTALLED_VERSION) is newer than target ($TARGET_VERSION)"
      if [[ "$DRY_RUN" == "1" ]]; then
        log_info "[dry-run] Would downgrade from $INSTALLED_VERSION to $TARGET_VERSION"
      else
        log_info "Use --force to install anyway."
        exit 0
      fi
    else
      log_info "Update available: $INSTALLED_VERSION -> $TARGET_VERSION"
    fi
  fi

  # Find deb URL
  local DEB_URL
  if [[ -n "$VERSION" ]]; then
    # For specific version, look through all assets
    DEB_URL=$(echo "$RELEASE_JSON" | grep '"browser_download_url"' | grep -E "$DEB_PATTERN" | head -1 | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/')
  else
    DEB_URL=$(parse_json_array_field "$RELEASE_JSON" "assets" "$DEB_PATTERN")
  fi

  if [[ -z "$DEB_URL" ]]; then
    log_error "No .deb file found in release $TARGET_VERSION"
    exit 1
  fi

  local DEB_NAME
  DEB_NAME=$(basename "$DEB_URL")

  echo ""
  log_info "Package: ${BOLD}$DEB_NAME${NC}"
  log_info "URL:     $DEB_URL"
  echo ""

  # Dry run
  if [[ "$DRY_RUN" == "1" ]]; then
    log_info "[dry-run] Would download: $DEB_NAME"
    log_info "[dry-run] Would install:  dpkg -i $DEB_NAME"
    echo ""
    log_info "Dry run complete. No changes made."
    exit 0
  fi

  # Download
  local TMP_DIR
  TMP_DIR=$(mktemp -d)
  trap 'rm -rf "$TMP_DIR"' EXIT

  log_info "Downloading $DEB_NAME..."

  local CURL_OPTS="-fL"
  if [[ "$QUIET" == "1" ]]; then
    CURL_OPTS="-fsSL"
  fi

  if [[ "$VERBOSE" == "1" ]]; then
    curl $CURL_OPTS -o "$TMP_DIR/$DEB_NAME" "$DEB_URL"
  else
    curl $CURL_OPTS --progress-bar -o "$TMP_DIR/$DEB_NAME" "$DEB_URL" &
    local curl_pid=$!
    spinner $curl_pid "Downloading..."
    wait $curl_pid || {
      log_error "Download failed"
      exit 1
    }
  fi

  # Verify download
  if [[ ! -f "$TMP_DIR/$DEB_NAME" ]]; then
    log_error "Download failed - file not found"
    exit 1
  fi

  local FILE_SIZE
  FILE_SIZE=$(stat -c%s "$TMP_DIR/$DEB_NAME" 2>/dev/null || stat -f%z "$TMP_DIR/$DEB_NAME" 2>/dev/null || echo "0")
  if [[ "$FILE_SIZE" -lt 1000 ]]; then
    log_error "Downloaded file is too small (${FILE_SIZE} bytes) - may be corrupted"
    exit 1
  fi

  log_verbose "Downloaded: $FILE_SIZE bytes"

  # Install
  log_info "Installing $DEB_NAME..."

  if ! dpkg -i "$TMP_DIR/$DEB_NAME"; then
    log_error "Installation failed"
    log_info "Try running: pkg install -y glibc-repo && pkg update && pkg install -y glibc openssl-glibc"
    exit 1
  fi

  # Post-install verification
  if check_installed; then
    local NEW_VERSION
    NEW_VERSION=$(get_installed_version)
    echo ""
    log_success "OpenCode installed successfully!"
    echo ""
    log_info "Installed: ${GREEN}${BOLD}$NEW_VERSION${NC}"
    echo ""
    log_info "Run: ${BOLD}opencode --version${NC}"
  else
    log_warn "Installation completed but cannot verify package status"
    log_info "Try running: ${BOLD}opencode --version${NC}"
  fi
}

main "$@"
