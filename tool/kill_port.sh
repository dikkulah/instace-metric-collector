#!/usr/bin/env bash
# Free a TCP listen port before starting agent/hub (macOS/Linux).
set -euo pipefail

port="${1:-}"
if [[ -z "$port" ]]; then
  echo "usage: kill_port.sh <port>" >&2
  exit 1
fi

if ! command -v lsof >/dev/null 2>&1; then
  exit 0
fi

pids="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -z "$pids" ]]; then
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=make_helpers.sh
source "$ROOT/tool/make_helpers.sh" 2>/dev/null || true

if declare -F make_info >/dev/null; then
  make_info "Freeing port ${port} (stopping old process)…"
else
  echo "Stopping process(es) on port ${port}…"
fi

# shellcheck disable=SC2086
kill ${pids} 2>/dev/null || true
sleep 0.3

still="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$still" ]]; then
  # shellcheck disable=SC2086
  kill -9 ${still} 2>/dev/null || true
fi

if declare -F make_ok >/dev/null; then
  make_ok "Port ${port} is ready"
fi
