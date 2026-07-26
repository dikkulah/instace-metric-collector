#!/usr/bin/env bash
# Install outpost-agent: binary + env file + optional systemd service.
#
# Usage:
#   curl -fsSL .../install_agent.sh | bash -s -- --hub-url URL --token TOKEN
#   ./tool/install_agent.sh --local go/dist/outpost-agent_linux-amd64 --user
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=make_helpers.sh
source "$ROOT/tool/make_helpers.sh"

GITHUB_REPO="${OUTPOST_GITHUB_REPO:-dikkulah/instance-metric-collector}"
VERSION="${OUTPOST_VERSION:-}"
HUB_URL="${METRICS_PUSH_INGEST_URL:-}"
AUTH_TOKEN="${METRICS_PUSH_AUTH_TOKEN:-}"
AGENT_ID="${METRICS_PUSH_AGENT_ID:-}"
LOCAL_BINARY=""
USER_INSTALL=false
INSTALL_DIR=""
CONFIG_DIR=""
SERVICE_NAME="outpost-agent"

usage() {
  cat <<'EOF'
Install outpost-agent on this host.

Options:
  --version TAG          Release tag (e.g. v0.1.0). Default: latest GitHub release.
  --local PATH           Use a local binary instead of downloading (dev/CI).
  --hub-url URL          METRICS_PUSH_INGEST_URL (enables push mode).
  --token TOKEN          METRICS_PUSH_AUTH_TOKEN (hub METRICS_HUB_INGEST_TOKEN).
  --agent-id ID          METRICS_PUSH_AGENT_ID (default: hostname).
  --user                 Install to ~/.local/bin (no systemd, no root).
  --install-dir PATH     Binary directory (default: /usr/local/bin or ~/.local/bin).
  -h, --help             Show this help.

Environment:
  OUTPOST_GITHUB_REPO    GitHub owner/repo for release assets.
  OUTPOST_VERSION        Same as --version.

Examples:
  ./tool/install_agent.sh --local go/dist/outpost-agent_linux-amd64 --user
  ./tool/install_agent.sh --version v0.1.0 --hub-url http://hub:8081/api/v1/ingest --token secret
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --local) LOCAL_BINARY="$2"; shift 2 ;;
    --hub-url) HUB_URL="$2"; shift 2 ;;
    --token) AUTH_TOKEN="$2"; shift 2 ;;
    --agent-id) AGENT_ID="$2"; shift 2 ;;
    --user) USER_INSTALL=true; shift ;;
    --install-dir) INSTALL_DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

detect_platform() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$os" in
    linux) os="linux" ;;
    darwin) os="darwin" ;;
    *) echo "Unsupported OS: $os" >&2; exit 1 ;;
  esac
  case "$arch" in
    x86_64|amd64) arch="amd64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) echo "Unsupported arch: $arch" >&2; exit 1 ;;
  esac
  echo "${os}-${arch}"
}

setup_paths() {
  if [[ "$USER_INSTALL" == true ]] || [[ -n "$INSTALL_DIR" ]]; then
    INSTALL_DIR="${INSTALL_DIR:-${HOME}/.local/bin}"
    CONFIG_DIR="${HOME}/.config/outpost-agent"
  else
    INSTALL_DIR="/usr/local/bin"
    CONFIG_DIR="/etc/outpost-agent"
  fi
  mkdir -p "$INSTALL_DIR" "$CONFIG_DIR"
}

install_binary() {
  local dest="$INSTALL_DIR/outpost-agent"
  local plat
  plat="$(detect_platform)"

  if [[ -n "$LOCAL_BINARY" ]]; then
    if [[ ! -f "$LOCAL_BINARY" ]]; then
      echo "Local binary not found: $LOCAL_BINARY" >&2
      exit 1
    fi
    make_step "Installing from local binary"
    cp "$LOCAL_BINARY" "$dest"
  else
    if [[ -z "$VERSION" ]]; then
      make_step "Resolving latest release from GitHub"
      VERSION="$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')"
      if [[ -z "$VERSION" ]]; then
        echo "Could not resolve latest release for ${GITHUB_REPO}" >&2
        exit 1
      fi
    fi
    local asset="outpost-agent_${plat}"
    local url="https://github.com/${GITHUB_REPO}/releases/download/${VERSION}/${asset}"
    make_step "Downloading ${asset} (${VERSION})"
    curl -fsSL "$url" -o "$dest"
  fi

  chmod +x "$dest"
  make_ok "Installed → ${dest}"
}

write_env_file() {
  local envfile="$CONFIG_DIR/agent.env"
  local hostname
  hostname="$(hostname -s 2>/dev/null || hostname)"
  [[ -n "$AGENT_ID" ]] || AGENT_ID="$hostname"

  make_step "Writing config → ${envfile}"
  cat >"$envfile" <<EOF
# outpost-agent — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
METRICS_COLLECTION_INTERVAL=60000
METRICS_UI_ENABLED=false
DOCKER_ENABLED=true
EOF

  if [[ -n "$HUB_URL" ]]; then
    cat >>"$envfile" <<EOF
METRICS_PUSH_ENABLED=true
METRICS_PUSH_INGEST_URL=${HUB_URL}
METRICS_PUSH_AGENT_ID=${AGENT_ID}
METRICS_PUSH_SPOOL_PATH=${CONFIG_DIR}/push-spool.db
LOGGING_FILE_NAME=
EOF
    if [[ -n "$AUTH_TOKEN" ]]; then
      echo "METRICS_PUSH_AUTH_TOKEN=${AUTH_TOKEN}" >>"$envfile"
    fi
  else
    cat >>"$envfile" <<EOF
METRICS_PUSH_ENABLED=false
METRICS_UI_ENABLED=true
SERVER_PORT=8080
EOF
  fi
  chmod 600 "$envfile"
  make_ok "Config written"
}

install_systemd() {
  if [[ "$USER_INSTALL" == true ]] || [[ "$(uname -s)" != "Linux" ]]; then
    make_hint "Run manually: env \$(grep -v '^#' ${CONFIG_DIR}/agent.env | xargs) outpost-agent"
    return
  fi
  if [[ "$(id -u)" -ne 0 ]]; then
    make_hint "Re-run with sudo to install systemd unit, or use --user"
    make_hint "Manual: env \$(grep -v '^#' ${CONFIG_DIR}/agent.env | xargs) ${INSTALL_DIR}/outpost-agent"
    return
  fi

  local unit="/etc/systemd/system/${SERVICE_NAME}.service"
  make_step "Installing systemd unit → ${unit}"
  cat >"$unit" <<EOF
[Unit]
Description=Outpost metrics agent
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=${CONFIG_DIR}/agent.env
ExecStart=${INSTALL_DIR}/outpost-agent
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}.service"
  make_ok "Service started: systemctl status ${SERVICE_NAME}"
}

main() {
  make_banner "Outpost Agent Installer"
  setup_paths
  install_binary
  write_env_file
  install_systemd
  echo ""
  make_ok "Installation complete"
  if [[ -n "$HUB_URL" ]]; then
    make_info "Agent ID: ${AGENT_ID} → push to ${HUB_URL}"
  fi
}

main
