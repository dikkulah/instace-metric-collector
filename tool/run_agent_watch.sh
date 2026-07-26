#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=make_helpers.sh
source "$ROOT/tool/make_helpers.sh"
# shellcheck source=air_path.sh
source "$ROOT/tool/air_path.sh"

PORT="${SERVER_PORT:-8080}"

if ! air_on_path; then
  echo "air not found. Install: go install github.com/air-verse/air@latest" >&2
  echo "Ensure \$(go env GOPATH)/bin is on your PATH." >&2
  exit 1
fi

ensure_ui_embedded "$ROOT"

make_step "Preparing agent (port ${PORT})"
bash "$ROOT/tool/kill_port.sh" "$PORT"

make_banner "Metrics Agent (Go auto-reload)" \
  "Dashboard" "http://localhost:${PORT}/" \
  "API" "http://localhost:${PORT}/api/meta"

if [[ "${METRICS_PUSH_ENABLED:-}" == "true" ]]; then
  HUB_PORT="${HUB_PORT:-8081}"
  INGEST_URL="${METRICS_PUSH_INGEST_URL:-http://localhost:${HUB_PORT}/api/v1/ingest}"
  AGENT_ID="${METRICS_PUSH_AGENT_ID:-local-agent}"
  make_hint "View in hub: http://localhost:${HUB_PORT}/hub/agents/${AGENT_ID}"
  make_info "Pushing to ${INGEST_URL}"
fi

make_ok "Save a .go file → agent rebuilds automatically"
make_info "Ctrl+C to stop"
echo ""

cd "$ROOT/go"
exec env \
  METRICS_COLLECTION_INTERVAL=5000 \
  METRICS_UI_ENABLED=true \
  SERVER_PORT="$PORT" \
  air -c .air.agent.toml
