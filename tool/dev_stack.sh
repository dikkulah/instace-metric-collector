#!/usr/bin/env bash
# Local dev: hub (foreground) + push agent (background). Operator UI = hub only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=make_helpers.sh
source "$ROOT/tool/make_helpers.sh"

HUB_PORT="${HUB_PORT:-8081}"
AGENT_PORT="${AGENT_PORT:-8080}"
AGENT_ID="${METRICS_PUSH_AGENT_ID:-local-dev}"
HUB_BIN="$ROOT/go/bin/hub"
AGENT_BIN="$ROOT/go/bin/agent"
AGENT_LOG="${TMPDIR:-/tmp}/imc-dev-agent.log"

if [[ ! -x "$HUB_BIN" ]] || [[ ! -x "$AGENT_BIN" ]]; then
  make_step "Building binaries"
  make -C "$ROOT" build
fi

make_step "Preparing ports ${HUB_PORT} (hub) and ${AGENT_PORT} (agent)"
bash "$ROOT/tool/kill_port.sh" "$HUB_PORT"
bash "$ROOT/tool/kill_port.sh" "$AGENT_PORT"

make_step "Starting push agent in background"
(
  cd "$ROOT"
  env \
    METRICS_COLLECTION_INTERVAL=5000 \
    METRICS_UI_ENABLED=true \
    METRICS_PUSH_ENABLED=true \
    METRICS_PUSH_INGEST_URL="http://localhost:${HUB_PORT}/api/v1/ingest" \
    METRICS_PUSH_AGENT_ID="$AGENT_ID" \
    SERVER_PORT="$AGENT_PORT" \
    "$AGENT_BIN" >>"$AGENT_LOG" 2>&1
) &
AGENT_PID=$!

cleanup() {
  if kill -0 "$AGENT_PID" 2>/dev/null; then
    kill "$AGENT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

sleep 2

make_banner "Dev stack — use the hub UI" \
  "Hub (operator UI)" "http://localhost:${HUB_PORT}/hub" \
  "Agent drill-down" "http://localhost:${HUB_PORT}/hub/agents/${AGENT_ID}" \
  "Alerts" "http://localhost:${HUB_PORT}/alerts"

make_info "Agent pushes to hub in background (log: ${AGENT_LOG})"
make_info "Local agent UI optional: http://localhost:${AGENT_PORT}/"
make_info "Ctrl+C stops hub and agent"
echo ""

cd "$ROOT"
exec env \
  METRICS_COLLECTION_INTERVAL=5000 \
  METRICS_UI_ENABLED=true \
  SERVER_PORT="$HUB_PORT" \
  "$HUB_BIN"
