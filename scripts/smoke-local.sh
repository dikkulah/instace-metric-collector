#!/usr/bin/env bash
# Backward-compatible wrapper — use tool/smoke_local.sh or `make ci-smoke`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/tool/smoke_local.sh" "$@"
