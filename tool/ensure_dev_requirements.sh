#!/usr/bin/env bash
# Verify local dev prerequisites for instance-metric-collector.
# Usage: ./tool/ensure_dev_requirements.sh [--check]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHECK_ONLY="${1:-}"

errors=0
warnings=0

log_ok() { echo "  ✓ $*"; }
log_warn() { echo "  ! $*"; warnings=$((warnings + 1)); }
log_fail() { echo "  ✗ $*" >&2; errors=$((errors + 1)); }

ensure_go() {
  echo "Go"
  if ! command -v go >/dev/null; then
    log_fail "go not in PATH — install Go 1.22+"
    return
  fi
  local version
  version="$(go version 2>&1 || true)"
  if echo "$version" | grep -qE 'go1\.(22|23|24)'; then
    log_ok "$version"
  else
    log_warn "Go 1.22+ recommended — found: $version"
  fi
}

ensure_node() {
  echo "Node.js (for UI build)"
  if ! command -v node >/dev/null; then
    log_fail "node not in PATH — install Node 22+"
    return
  fi
  local version
  version="$(node --version 2>&1 || true)"
  log_ok "$version"
}

ensure_docker_optional() {
  echo "Docker (optional — for container metrics in smoke)"
  if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
    log_ok "docker daemon reachable"
  else
    log_warn "docker not available — smoke runs with DOCKER_ENABLED=false"
  fi
}

echo "Checking dev requirements for instance-metric-collector"
ensure_go
ensure_node
ensure_docker_optional

if [[ "$errors" -gt 0 ]]; then
  echo ""
  echo "FAILED: $errors error(s), $warnings warning(s)" >&2
  exit 1
fi

echo ""
echo "OK: requirements met ($warnings warning(s))"
