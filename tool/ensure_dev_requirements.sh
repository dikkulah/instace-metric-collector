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

ensure_java() {
  echo "Java"
  if ! command -v java >/dev/null; then
    log_fail "java not in PATH — install JDK 21"
    return
  fi
  local version
  version="$(java -version 2>&1 | head -1 || true)"
  if echo "$version" | grep -qE 'version "21'; then
    log_ok "$version"
  else
    log_warn "JDK 21 recommended — found: $version"
  fi
}

ensure_maven_wrapper() {
  echo "Maven wrapper"
  if [[ ! -x "$ROOT/mvnw" ]]; then
    log_fail "mvnw not found or not executable"
    return
  fi
  log_ok "mvnw present"
}

ensure_docker_optional() {
  echo "Docker (optional — for container metrics in smoke)"
  if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
    log_ok "docker daemon reachable"
  else
    log_warn "docker not available — smoke runs with docker.enabled=false"
  fi
}

echo "Checking dev requirements for instance-metric-collector"
ensure_java
ensure_maven_wrapper
ensure_docker_optional

if [[ "$errors" -gt 0 ]]; then
  echo ""
  echo "FAILED: $errors error(s), $warnings warning(s)" >&2
  exit 1
fi

echo ""
echo "OK: requirements met ($warnings warning(s))"
