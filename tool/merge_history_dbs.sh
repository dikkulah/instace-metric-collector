#!/usr/bin/env bash
# Merge legacy metrics-history.db files into data/metrics-history.db (dev migration).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=history_db_path.sh
source "$ROOT/tool/history_db_path.sh"

TARGET="$(resolve_history_db "$ROOT")"
LEGACY=(
  "$ROOT/go/metrics-history.db"
  "$ROOT/metrics-history.db"
)

merge_one() {
  local src="$1"
  [[ -f "$src" ]] || return 0
  [[ "$(cd "$(dirname "$src")" && pwd)/$(basename "$src")" == "$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")" ]] && return 0

  echo "Merging $(basename "$src") → $TARGET"
  sqlite3 "$TARGET" <<SQL
ATTACH DATABASE '$src' AS legacy;
INSERT OR IGNORE INTO raw_samples
  (agent_id, collected_at, ingested_at, schema_version, host_os, host_arch, cpu_load, used_memory, total_memory, payload_json)
SELECT agent_id, collected_at, ingested_at, schema_version, host_os, host_arch, cpu_load, used_memory, total_memory, payload_json
FROM legacy.raw_samples;
DETACH DATABASE legacy;
SQL
}

mkdir -p "$(dirname "$TARGET")"
if [[ ! -f "$TARGET" ]]; then
  for legacy in "${LEGACY[@]}"; do
    if [[ -f "$legacy" ]]; then
      cp "$legacy" "$TARGET"
      echo "Initialized $TARGET from $(basename "$legacy")"
      break
    fi
  done
fi

for legacy in "${LEGACY[@]}"; do
  merge_one "$legacy"
done

sqlite3 "$TARGET" "SELECT COUNT(*) AS samples, MIN(collected_at), MAX(collected_at) FROM raw_samples;"
echo "Done: $TARGET"
