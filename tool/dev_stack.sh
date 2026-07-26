#!/usr/bin/env bash
# Local dev: hub (foreground) + push agent (background). Uses air for Go reload when installed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=make_helpers.sh
source "$ROOT/tool/make_helpers.sh"
# shellcheck source=air_path.sh
source "$ROOT/tool/air_path.sh"

HUB_PORT="${HUB_PORT:-8081}"
AGENT_PORT="${AGENT_PORT:-8080}"
AGENT_ID="${METRICS_PUSH_AGENT_ID:-local-dev}"
HUB_BIN="$ROOT/go/bin/hub"
AGENT_BIN="$ROOT/go/bin/agent"
AGENT_LOG="${TMPDIR:-/tmp}/imc-dev-agent.log"
USE_AIR=false

if air_on_path; then
  USE_AIR=true
fi

if [[ "$USE_AIR" == "true" ]]; then
  ensure_ui_embedded "$ROOT"
else
  if [[ ! -x "$HUB_BIN" ]] || [[ ! -x "$AGENT_BIN" ]]; then
    make_step "Building binaries"
    make -C "$ROOT" build
  fi
fi

make_step "Preparing ports ${HUB_PORT} (hub) and ${AGENT_PORT} (agent)"
bash "$ROOT/tool/kill_port.sh" "$HUB_PORT"
bash "$ROOT/tool/kill_port.sh" "$AGENT_PORT"

AGENT_PID=""

cleanup() {
  if [[ -n "$AGENT_PID" ]] && kill -0 "$AGENT_PID" 2>/dev/null; then
    kill "$AGENT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

make_step "Starting push agent in background"
if [[ "$USE_AIR" == "true" ]]; then
  (
    cd "$ROOT/go"
    env \
      METRICS_COLLECTION_INTERVAL=5000 \
      METRICS_UI_ENABLED=true \
      METRICS_PUSH_ENABLED=true \
      METRICS_PUSH_INGEST_URL="http://localhost:${HUB_PORT}/api/v1/ingest" \
      METRICS_PUSH_AGENT_ID="$AGENT_ID" \
      SERVER_PORT="$AGENT_PORT" \
      air -c .air.agent.toml >>"$AGENT_LOG" 2>&1
  ) &
else
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
fi
AGENT_PID=$!

sleep 2

make_banner "Dev stack — use the hub UI" \
  "Hub (operator UI)" "http://localhost:${HUB_PORT}/hub" \
  "Agent drill-down" "http://localhost:${HUB_PORT}/hub/agents/${AGENT_ID}" \
  "Agent alerts" "http://localhost:${HUB_PORT}/hub/agents/${AGENT_ID}/alerts"

if [[ "$USE_AIR" == "true" ]]; then
  make_ok "Go auto-reload: save a .go file → hub + agent rebuild automatically"
else
  make_hint "Go auto-reload: go install github.com/air-verse/air@latest then restart"
fi

make_info "Agent pushes to hub in background (log: ${AGENT_LOG})"
make_info "UI hot reload: make dev-watch → http://localhost:5173/hub"
make_info "Ctrl+C stops hub and agent"
echo ""

if [[ "$USE_AIR" == "true" ]]; then
  cd "$ROOT/go"
  exec env \
    METRICS_COLLECTION_INTERVAL=5000 \
    METRICS_UI_ENABLED=true \
    SERVER_PORT="$HUB_PORT" \
    air -c .air.hub.toml
fi

cd "$ROOT"
exec env \
  METRICS_COLLECTION_INTERVAL=5000 \
  METRICS_UI_ENABLED=true \
  SERVER_PORT="$HUB_PORT" \
  "$HUB_BIN"
