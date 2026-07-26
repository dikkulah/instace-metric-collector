#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=make_helpers.sh
source "$ROOT/tool/make_helpers.sh"

PORT="${SERVER_PORT:-8081}"
BIN="$ROOT/go/bin/hub"

if [[ ! -x "$BIN" ]]; then
  echo "Hub binary not found. Run: make build" >&2
  exit 1
fi

make_step "Preparing hub (port ${PORT})"
bash "$ROOT/tool/kill_port.sh" "$PORT"

make_banner "Metrics Hub" \
  "Hub UI" "http://localhost:${PORT}/hub" \
  "Alerts" "http://localhost:${PORT}/alerts" \
  "Ingest" "http://localhost:${PORT}/api/v1/ingest" \
  "Thresholds" "http://localhost:${PORT}/hub (settings panel)"

make_hint "Start an agent with push → METRICS_PUSH_INGEST_URL=http://localhost:${PORT}/api/v1/ingest"
make_info "Ctrl+C to stop"
echo ""

cd "$ROOT"
exec env \
  METRICS_COLLECTION_INTERVAL=5000 \
  METRICS_UI_ENABLED=true \
  SERVER_PORT="$PORT" \
  "$BIN"
