#!/usr/bin/env bash
# Verify locale JSON files have identical key sets (en vs tr).
# Usage: ./tool/i18n_lint.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCALES_DIR="$ROOT/src/main/resources/static/locales"

if [[ ! -d "$LOCALES_DIR" ]]; then
  echo "i18n_lint: skip — $LOCALES_DIR not found (Phase 3 not implemented yet)"
  exit 0
fi

if ! command -v python3 >/dev/null; then
  echo "i18n_lint: python3 required" >&2
  exit 1
fi

LOCALES_DIR="$LOCALES_DIR" python3 <<'PY'
import json, os
from pathlib import Path

locales_dir = Path(os.environ["LOCALES_DIR"])
files = sorted(locales_dir.glob("*.json"))
if len(files) < 2:
    print("i18n_lint: need at least 2 locale files")
    sys.exit(1)

def flatten_keys(obj, prefix=""):
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys |= flatten_keys(v, p)
            else:
                keys.add(p)
    return keys

data = {}
for f in files:
    with open(f) as fh:
        data[f.stem] = flatten_keys(json.load(fh))

base = sorted(data.keys())[0]
base_keys = data[base]
errors = 0
for loc, keys in data.items():
    if loc == base:
        continue
    missing = base_keys - keys
    extra = keys - base_keys
    if missing:
        print(f"  ✗ {loc}.json missing keys: {sorted(missing)}")
        errors += 1
    if extra:
        print(f"  ✗ {loc}.json extra keys: {sorted(extra)}")
        errors += 1

if errors:
    print(f"i18n_lint: FAILED ({errors} mismatch(es))")
    sys.exit(1)
print(f"i18n_lint: OK ({len(files)} locales, {len(base_keys)} keys)")
PY
