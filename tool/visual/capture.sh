#!/usr/bin/env bash
# Print visual-test URLs or verify DEMO_MODE agent is up.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MANIFEST="$ROOT/tool/visual/manifests/routes.json"
PORT="${VISUAL_PORT:-18081}"
BASE_URL="http://127.0.0.1:${PORT}"
ROUTES_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --routes-only) ROUTES_ONLY=true ;;
  esac
done

if [[ "$ROUTES_ONLY" == false ]]; then
  if curl -fsS "${BASE_URL}/api/meta" >/dev/null 2>&1; then
    echo "OK: agent listening on ${BASE_URL}"
  else
    echo "ERROR: no agent on ${BASE_URL}" >&2
    echo "Start with: make ui-visual-serve" >&2
    exit 1
  fi
fi

python3 - "$MANIFEST" "$BASE_URL" <<'PY'
import json, sys
manifest_path, base_url = sys.argv[1], sys.argv[2]
data = json.load(open(manifest_path))
for r in data["routes"]:
    path = r["path"]
    url = base_url + path
    vp = r["viewport"]
    print(f"{r['id']}\t{vp['width']}x{vp['height']}\t{url}")
PY
