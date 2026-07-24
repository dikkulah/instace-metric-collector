#!/usr/bin/env bash
# Interactive first-time / refresh setup.
#
# Usage:
#   ./tool/onboard.sh              # interactive
#   PROFILE=app ./tool/onboard.sh  # non-interactive: setup + hooks + ci-fast
#   PROFILE=full ./tool/onboard.sh # + smoke run
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p logs
LOG_FILE="$ROOT/logs/onboard-latest.log"
echo "Onboard $(date -u +%Y-%m-%dT%H:%M:%SZ) — log: logs/onboard-latest.log" | tee "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

PROFILE="${PROFILE:-}"
WANT_HOOKS=true
WANT_CI_FAST=false
WANT_SMOKE=false

ask_yes_no() {
  local prompt="$1"
  local default="${2:-y}"
  local reply
  if [[ "$default" == "y" ]]; then
    read -r -p "$prompt [E/h]: " reply
    reply="${reply:-e}"
    [[ "$reply" =~ ^[EeYy]$ ]]
  else
    read -r -p "$prompt [e/H]: " reply
    reply="${reply:-h}"
    [[ "$reply" =~ ^[EeYy]$ ]]
  fi
}

apply_profile() {
  case "$PROFILE" in
    app)
      WANT_HOOKS=true
      WANT_CI_FAST=true
      WANT_SMOKE=false
      ;;
    full)
      WANT_HOOKS=true
      WANT_CI_FAST=true
      WANT_SMOKE=true
      ;;
    *)
      echo "Bilinmeyen PROFILE=$PROFILE (app | full)" >&2
      exit 1
      ;;
  esac
}

interactive_menu() {
  echo ""
  echo "=== instance-metric-collector onboard ==="
  echo ""
  if ask_yes_no "Pre-push hook kurulsun mu? (go test)"; then
    WANT_HOOKS=true
  else
    WANT_HOOKS=false
  fi
  if ask_yes_no "Kurulum sonrası ci-fast çalıştırılsın mı?"; then
    WANT_CI_FAST=true
  fi
  if ask_yes_no "Smoke test de çalıştırılsın mı? (~2 dk)"; then
    WANT_SMOKE=true
  fi
}

chmod +x tool/ensure_dev_requirements.sh tool/setup_git_hooks.sh tool/ci_local.sh tool/smoke_local.sh 2>/dev/null || true

if [[ -n "$PROFILE" ]]; then
  apply_profile
else
  interactive_menu
fi

echo ""
echo "==> Dev requirements"
bash tool/ensure_dev_requirements.sh --check

echo ""
echo "==> Build agent"
make build

if [[ "$WANT_HOOKS" == "true" ]]; then
  echo ""
  echo "==> Git hooks"
  bash tool/setup_git_hooks.sh
fi

if [[ "$WANT_CI_FAST" == "true" ]]; then
  echo ""
  echo "==> ci-fast"
  bash tool/ci_local.sh --fast
fi

if [[ "$WANT_SMOKE" == "true" ]]; then
  echo ""
  echo "==> ci-smoke"
  bash tool/ci_local.sh
fi

echo ""
echo "Onboard tamamlandı."
echo "  make run       — uygulamayı başlat"
echo "  make ci-fast   — günlük doğrulama"
echo "  make ci-smoke  — milestone öncesi smoke"
