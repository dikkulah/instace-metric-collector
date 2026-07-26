#!/usr/bin/env bash
# Free a TCP listen port before starting agent/hub (macOS/Linux).
# Also kills `air` supervisors above the listener so they can't respawn it.
set -euo pipefail

port="${1:-}"
if [[ -z "$port" ]]; then
  echo "usage: kill_port.sh <port>" >&2
  exit 1
fi

if ! command -v lsof >/dev/null 2>&1; then
  exit 0
fi

listeners() {
  lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true
}

pids="$(listeners)"
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

# Collect air supervisors in the listener's ancestry; killing only the child
# lets air rebuild and re-bind the port during our startup.
air_parents=""
for pid in $pids; do
  p="$pid"
  while [[ -n "$p" && "$p" != "0" && "$p" != "1" ]]; do
    pp="$(ps -o ppid= -p "$p" 2>/dev/null | tr -d '[:space:]')"
    [[ -z "$pp" || "$pp" == "0" || "$pp" == "1" ]] && break
    cmd="$(ps -o comm= -p "$pp" 2>/dev/null | tr -d '[:space:]')"
    if [[ "$cmd" == "air" || "$cmd" == *"/air" ]]; then
      air_parents="$air_parents $pp"
    fi
    p="$pp"
  done
done

# shellcheck disable=SC2086
kill $air_parents $pids 2>/dev/null || true

# Wait for graceful shutdown, then escalate to SIGKILL.
for _ in 1 2 3 4 5; do
  sleep 0.3
  [[ -z "$(listeners)" ]] && break
done

still="$(listeners)"
if [[ -n "$still" ]]; then
  # shellcheck disable=SC2086
  kill -9 $air_parents $still 2>/dev/null || true
  for _ in 1 2 3 4 5; do
    sleep 0.2
    [[ -z "$(listeners)" ]] && break
  done
fi

if [[ -n "$(listeners)" ]]; then
  echo "ERROR: port ${port} is still in use after kill attempts:" >&2
  lsof -i "tcp:${port}" -sTCP:LISTEN >&2 || true
  exit 1
fi

if declare -F make_ok >/dev/null; then
  make_ok "Port ${port} is ready"
fi
