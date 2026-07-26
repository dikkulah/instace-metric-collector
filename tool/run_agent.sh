#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=make_helpers.sh
source "$ROOT/tool/make_helpers.sh"

PORT="${SERVER_PORT:-8080}"
BIN="$ROOT/go/bin/agent"

if [[ ! -x "$BIN" ]]; then
  echo "Agent binary not found. Run: make build" >&2
  exit 1
fi

make_step "Preparing agent (port ${PORT})"
bash "$ROOT/tool/kill_port.sh" "$PORT"

make_banner "Metrics Agent" \
  "Dashboard" "http://localhost:${PORT}/" \
  "Processes" "http://localhost:${PORT}/processes" \
  "Services" "http://localhost:${PORT}/services" \
  "API" "http://localhost:${PORT}/api/meta"

if [[ "${METRICS_PUSH_ENABLED:-}" == "true" ]]; then
  HUB_PORT="${HUB_PORT:-8081}"
  INGEST_URL="${METRICS_PUSH_INGEST_URL:-http://localhost:${HUB_PORT}/api/v1/ingest}"
  AGENT_ID="${METRICS_PUSH_AGENT_ID:-local-agent}"
  make_hint "View in hub: http://localhost:${HUB_PORT}/hub/agents/${AGENT_ID}"
  make_info "Pushing to ${INGEST_URL}"
fi

make_info "Collecting metrics every 5s · Ctrl+C to stop"
echo ""

cd "$ROOT"
exec env \
  METRICS_COLLECTION_INTERVAL=5000 \
  METRICS_UI_ENABLED=true \
  SERVER_PORT="$PORT" \
  "$BIN"
