#!/usr/bin/env bash
# Stop DEMO_MODE visual test agent started by serve.sh
set -euo pipefail

PORT="${VISUAL_PORT:-18081}"
PID_FILE="${TMPDIR:-/tmp}/imc-visual-agent-${PORT}.pid"

if [[ -f "$PID_FILE" ]]; then
  pid=$(cat "$PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    echo "Stopped agent pid ${pid} on :${PORT}"
  fi
  rm -f "$PID_FILE"
else
  echo "No pid file at ${PID_FILE}"
fi
