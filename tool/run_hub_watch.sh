#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=make_helpers.sh
source "$ROOT/tool/make_helpers.sh"
# shellcheck source=air_path.sh
source "$ROOT/tool/air_path.sh"
# shellcheck source=history_db_path.sh
source "$ROOT/tool/history_db_path.sh"

HISTORY_DB="$(resolve_history_db "$ROOT")"

PORT="${SERVER_PORT:-8081}"

if ! air_on_path; then
  echo "air not found. Install: go install github.com/air-verse/air@latest" >&2
  echo "Ensure \$(go env GOPATH)/bin is on your PATH." >&2
  exit 1
fi

ensure_ui_embedded "$ROOT"

make_step "Preparing hub (port ${PORT})"
bash "$ROOT/tool/kill_port.sh" "$PORT"

make_banner "Metrics Hub (Go auto-reload)" \
  "Hub UI" "http://localhost:${PORT}/hub" \
  "Alerts" "http://localhost:${PORT}/alerts" \
  "Ingest" "http://localhost:${PORT}/api/v1/ingest"

make_ok "Save a .go file → hub rebuilds automatically"
make_info "Ctrl+C to stop"
echo ""

cd "$ROOT/go"
exec env \
  METRICS_COLLECTION_INTERVAL=5000 \
  METRICS_UI_ENABLED=true \
  METRICS_HISTORY_DB_PATH="$HISTORY_DB" \
  SERVER_PORT="$PORT" \
  air -c .air.hub.toml
