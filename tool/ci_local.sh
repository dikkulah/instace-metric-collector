#!/usr/bin/env bash
# Run local CI equivalent (no GitHub Actions minutes).
#
# Usage:
#   ./tool/ci_local.sh           # unit tests + smoke run
#   ./tool/ci_local.sh --fast    # unit tests only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RUN_FAST=false

for arg in "$@"; do
  case "$arg" in
    --fast) RUN_FAST=true ;;
    -h|--help)
      sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

step() {
  echo ""
  echo "════════════════════════════════════════"
  echo "==> $1"
  echo "════════════════════════════════════════"
}

chmod +x tool/ensure_dev_requirements.sh tool/smoke_local.sh 2>/dev/null || true
bash tool/ensure_dev_requirements.sh --check

if [[ "$RUN_FAST" == "true" ]]; then
  step "unit tests"
  make -C go test
  echo ""
  echo "✓ ci_local (--fast): OK"
  exit 0
fi

step "smoke (tests + short app run)"
bash tool/smoke_local.sh

echo ""
echo "✓ ci_local: OK"
