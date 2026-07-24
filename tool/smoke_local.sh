#!/usr/bin/env bash
# Local smoke test — unit tests + short app run. No CI required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG_FILE="${SMOKE_LOG:-$ROOT/smoke-metrics-collector.log}"
JAR_GLOB="$ROOT/target/instance-metric-collector-*.jar"
INTERVAL_MS="${SMOKE_INTERVAL_MS:-3000}"
WAIT_SECS="${SMOKE_WAIT_SECS:-12}"
SERVER_PORT="${SMOKE_SERVER_PORT:-0}"

echo "==> Unit tests"
./mvnw -B -q test

echo "==> Package"
./mvnw -B -q -DskipTests package

JAR="$(ls -1 $JAR_GLOB 2>/dev/null | head -1 || true)"
if [[ -z "${JAR}" ]]; then
  echo "ERROR: jar not found under target/"
  exit 1
fi
echo "    jar: $JAR"

DOCKER_ENABLED=false
DOCKER_HOST_OPT=""
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  DOCKER_ENABLED=true
  if [[ -S "${HOME}/.docker/run/docker.sock" ]]; then
    DOCKER_HOST_OPT="--docker.host=unix://${HOME}/.docker/run/docker.sock"
  fi
  echo "==> Docker daemon reachable — docker.enabled=true"
else
  echo "==> Docker daemon not reachable — docker.enabled=false (host metrics only)"
fi

rm -f "$LOG_FILE"
echo "==> Starting app (${WAIT_SECS}s smoke, interval=${INTERVAL_MS}ms)"
# shellcheck disable=SC2086
java -jar "$JAR" \
  --server.port="$SERVER_PORT" \
  --logging.file.name="$LOG_FILE" \
  --metrics.collection.interval="$INTERVAL_MS" \
  --docker.collection.interval="$INTERVAL_MS" \
  --docker.enabled="$DOCKER_ENABLED" \
  $DOCKER_HOST_OPT \
  >"$ROOT/smoke-stdout.log" 2>&1 &
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
  echo "ERROR: app exited early. stdout:"
  cat "$ROOT/smoke-stdout.log" || true
  exit 1
fi

echo "==> Asserting log payload"
if [[ ! -f "$LOG_FILE" ]]; then
  echo "ERROR: log file missing: $LOG_FILE"
  cat "$ROOT/smoke-stdout.log" || true
  exit 1
fi

grep -q '"cpuLoad"' "$LOG_FILE" || { echo "ERROR: cpuLoad missing"; exit 1; }
grep -q '"usedMemory"' "$LOG_FILE" || { echo "ERROR: usedMemory missing"; exit 1; }
grep -q '"processInfos"' "$LOG_FILE" || { echo "ERROR: processInfos missing"; exit 1; }
grep -q '"serviceInfos"' "$LOG_FILE" || { echo "ERROR: serviceInfos missing"; exit 1; }
grep -q '"containers"' "$LOG_FILE" || { echo "ERROR: containers missing"; exit 1; }
grep -q '"diskUsage"' "$LOG_FILE" || { echo "ERROR: diskUsage missing"; exit 1; }
grep -q '"networkUsage"' "$LOG_FILE" || { echo "ERROR: networkUsage missing"; exit 1; }

# usedMemory must not be the old hardcoded bug value when totalMemory is large
if grep -qE '"usedMemory"[[:space:]]*:[[:space:]]*1[,}]' "$LOG_FILE" \
   && grep -qE '"totalMemory"[[:space:]]*:[[:space:]]*[0-9]{4,}' "$LOG_FILE"; then
  echo "ERROR: usedMemory looks stuck at 1 (old bug)"
  exit 1
fi

echo "==> Smoke OK (docker.enabled=$DOCKER_ENABLED)"
echo "    log: $LOG_FILE"
echo "    last payload snippet:"
grep '"cpuLoad"' "$LOG_FILE" | tail -1 | head -c 400
echo
