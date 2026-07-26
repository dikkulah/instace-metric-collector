#!/usr/bin/env bash
# Dev stack with hot reload: Vite UI (HMR) + optional air for Go binaries.
# Open http://localhost:5173/hub — no make build / restart for UI changes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=make_helpers.sh
source "$ROOT/tool/make_helpers.sh"

HUB_PORT="${HUB_PORT:-8081}"
AGENT_PORT="${AGENT_PORT:-8080}"
UI_PORT="${UI_PORT:-5173}"
AGENT_ID="${METRICS_PUSH_AGENT_ID:-local-dev}"
HUB_BIN="$ROOT/go/bin/hub"
AGENT_BIN="$ROOT/go/bin/agent"
FRONTEND="$ROOT/go/web/frontend"
AGENT_LOG="${TMPDIR:-/tmp}/imc-dev-agent.log"
USE_AIR=false

if command -v air >/dev/null 2>&1; then
  USE_AIR=true
fi

PIDS=()

cleanup() {
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

make_step "Preparing ports ${UI_PORT} (UI), ${HUB_PORT} (hub), ${AGENT_PORT} (agent)"
bash "$ROOT/tool/kill_port.sh" "$UI_PORT"
bash "$ROOT/tool/kill_port.sh" "$HUB_PORT"
bash "$ROOT/tool/kill_port.sh" "$AGENT_PORT"

if [[ ! -d "$FRONTEND/node_modules" ]]; then
  make_step "Installing UI dependencies"
  make -C "$ROOT" ui-install
fi

if [[ "$USE_AIR" == "false" ]]; then
  if [[ ! -x "$HUB_BIN" ]] || [[ ! -x "$AGENT_BIN" ]]; then
    make_step "Building binaries (one-time)"
    make -C "$ROOT" build
  fi
fi

start_hub() {
  if [[ "$USE_AIR" == "true" ]]; then
    (
      cd "$ROOT/go"
      env \
        METRICS_COLLECTION_INTERVAL=5000 \
        METRICS_UI_ENABLED=true \
        SERVER_PORT="$HUB_PORT" \
        air -c .air.hub.toml
    ) &
  else
    (
      cd "$ROOT"
      env \
        METRICS_COLLECTION_INTERVAL=5000 \
        METRICS_UI_ENABLED=true \
        SERVER_PORT="$HUB_PORT" \
        "$HUB_BIN"
    ) &
  fi
  PIDS+=($!)
}

start_agent() {
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
  PIDS+=($!)
}

make_step "Starting hub and push agent"
start_hub
sleep 1
start_agent
sleep 1

make_banner "Dev watch — hot reload" \
  "UI (use this)" "http://localhost:${UI_PORT}/hub" \
  "Agent drill-down" "http://localhost:${UI_PORT}/hub/agents/${AGENT_ID}" \
  "Hub API" "http://localhost:${HUB_PORT}/api/meta"

if [[ "$USE_AIR" == "true" ]]; then
  make_ok "Go: air — .go changes auto-rebuild hub + agent"
else
  make_hint "Go auto-reload: go install github.com/air-verse/air@latest"
  make_info "Without air, restart this command after Go changes"
fi

make_ok "UI: Vite HMR — save a .tsx file and the browser updates instantly"
make_info "Agent log: ${AGENT_LOG}"
make_info "Ctrl+C stops everything"
echo ""

cd "$FRONTEND"
export VITE_API_PROXY="http://127.0.0.1:${HUB_PORT}"
exec npm run dev -- --port "$UI_PORT" --host 127.0.0.1 --strictPort
