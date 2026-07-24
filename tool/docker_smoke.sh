#!/usr/bin/env bash
# Docker compose smoke — build, start, probe API, stop.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null; then
  echo "ERROR: docker not in PATH" >&2
  exit 1
fi

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

PORT="${METRICS_PORT:-18080}"
export METRICS_PORT="$PORT"

cleanup() {
  $COMPOSE down -v --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

echo "==> docker compose build"
$COMPOSE build

echo "==> docker compose up"
$COMPOSE up -d

echo "==> Waiting for API (up to 120s)"
deadline=$((SECONDS + 120))
ok=false
while [[ $SECONDS -lt $deadline ]]; do
  if curl -fsS "http://localhost:${PORT}/api/metrics/config" >/dev/null 2>&1; then
    ok=true
    break
  fi
  sleep 3
done

if [[ "$ok" != "true" ]]; then
  echo "ERROR: API not ready on port ${PORT}" >&2
  $COMPOSE logs --tail=80
  exit 1
fi

echo "==> Probing dashboard"
curl -fsS "http://localhost:${PORT}/" | grep -q "Instance Metric Collector" || {
  echo "ERROR: index.html missing expected title" >&2
  exit 1
}

echo "==> Docker smoke OK (port=${PORT})"
