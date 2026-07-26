#!/usr/bin/env bash
# Start DEMO_MODE agent for visual testing on VISUAL_PORT (default 18081).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${VISUAL_PORT:-18081}"
PID_FILE="${TMPDIR:-/tmp}/imc-visual-agent-${PORT}.pid"
LOG_FILE="${TMPDIR:-/tmp}/imc-visual-agent-${PORT}.log"

cd "$ROOT"
make -C go build >/dev/null

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Agent already running on :${PORT} (pid $(cat "$PID_FILE"))"
  exit 0
fi

if lsof -ti:"${PORT}" >/dev/null 2>&1; then
  echo "ERROR: port ${PORT} in use (not our pid file). Stop it or set VISUAL_PORT." >&2
  exit 1
fi

DEMO_MODE=true \
METRICS_UI_ENABLED=true \
DOCKER_ENABLED=false \
METRICS_COLLECTION_INTERVAL=5000 \
SERVER_PORT="${PORT}" \
./go/bin/agent >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/meta" >/dev/null 2>&1; then
    echo "DEMO_MODE agent ready: http://127.0.0.1:${PORT}"
    echo "Log: ${LOG_FILE}"
    echo "Stop: kill \$(cat ${PID_FILE})"
    exit 0
  fi
  sleep 0.5
done

echo "ERROR: agent failed to start. Log:" >&2
tail -20 "$LOG_FILE" >&2 || true
exit 1
