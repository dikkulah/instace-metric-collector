#!/usr/bin/env bash
# Local smoke test — Go unit tests + short agent run. No CI required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG_FILE="${SMOKE_LOG:-$ROOT/smoke-metrics-collector.log}"
INTERVAL_MS="${SMOKE_INTERVAL_MS:-3000}"
WAIT_SECS="${SMOKE_WAIT_SECS:-12}"
SERVER_PORT="${SMOKE_SERVER_PORT:-18080}"

rm -f "$LOG_FILE"

echo "==> Unit tests"
make -C go test

echo "==> Build agent"
make -C go build

DOCKER_ENABLED=false
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  DOCKER_ENABLED=true
  echo "==> Docker daemon reachable — DOCKER_ENABLED=true"
else
  echo "==> Docker daemon not reachable — DOCKER_ENABLED=false (host metrics only)"
fi

echo "==> Starting agent (${WAIT_SECS}s smoke, interval=${INTERVAL_MS}ms)"
METRICS_COLLECTION_INTERVAL="$INTERVAL_MS" \
METRICS_UI_ENABLED=true \
DOCKER_ENABLED="$DOCKER_ENABLED" \
SERVER_PORT="$SERVER_PORT" \
LOGGING_FILE_NAME="$LOG_FILE" \
./go/bin/agent >"$ROOT/smoke-stdout.log" 2>&1 &
APP_PID=$!

cleanup() {
  if kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

sleep "$WAIT_SECS"

if ! kill -0 "$APP_PID" 2>/dev/null; then
  echo "ERROR: agent exited early. stdout:"
  cat "$ROOT/smoke-stdout.log" || true
  exit 1
fi

echo "==> Asserting REST payload"
RESP="$(curl -fsS "http://localhost:${SERVER_PORT}/api/metrics/current")"
echo "$RESP" | grep -q '"cpuLoad"' || { echo "ERROR: cpuLoad missing"; exit 1; }
echo "$RESP" | grep -q '"usedMemory"' || { echo "ERROR: usedMemory missing"; exit 1; }
echo "$RESP" | grep -q '"processInfos"' || { echo "ERROR: processInfos missing"; exit 1; }
echo "$RESP" | grep -q '"serviceInfos"' || { echo "ERROR: serviceInfos missing"; exit 1; }
echo "$RESP" | grep -q '"containers"' || { echo "ERROR: containers missing"; exit 1; }
echo "$RESP" | grep -q '"diskUsage"' || { echo "ERROR: diskUsage missing"; exit 1; }
echo "$RESP" | grep -q '"networkUsage"' || { echo "ERROR: networkUsage missing"; exit 1; }

echo "==> Asserting JSON log payload"
if [[ ! -f "$LOG_FILE" ]]; then
  echo "ERROR: log file missing: $LOG_FILE"
  exit 1
fi
grep -q '"cpuLoad"' "$LOG_FILE" || { echo "ERROR: cpuLoad missing in log"; exit 1; }
grep -q '"usedMemory"' "$LOG_FILE" || { echo "ERROR: usedMemory missing in log"; exit 1; }
grep -q '"processInfos"' "$LOG_FILE" || { echo "ERROR: processInfos missing in log"; exit 1; }

echo "==> Smoke OK (docker.enabled=$DOCKER_ENABLED)"
echo "    last payload snippet:"
echo "$RESP" | head -c 400
echo
