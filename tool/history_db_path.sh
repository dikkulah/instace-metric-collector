#!/usr/bin/env bash
# Resolve hub SQLite history path (stable across cwd / air vs binary).
# Override with METRICS_HISTORY_DB_PATH.
resolve_history_db() {
  local root="$1"
  local path="${METRICS_HISTORY_DB_PATH:-$root/data/metrics-history.db}"
  mkdir -p "$(dirname "$path")"
  if [[ ! -f "$path" ]]; then
    for legacy in "$root/go/metrics-history.db" "$root/metrics-history.db"; do
      if [[ -f "$legacy" ]]; then
        cp "$legacy" "$path"
        break
      fi
    done
  fi
  printf '%s' "$path"
}
