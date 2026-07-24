#!/usr/bin/env bash
# Compare EN/TR locale key coverage for the React SPA.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EN="$ROOT/go/web/frontend/src/i18n/en.json"
TR="$ROOT/go/web/frontend/src/i18n/tr.json"

python3 - <<'PY'
import json, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent if False else Path(".")
en = json.loads(Path("go/web/frontend/src/i18n/en.json").read_text())
tr = json.loads(Path("go/web/frontend/src/i18n/tr.json").read_text())
missing_tr = sorted(set(en) - set(tr))
missing_en = sorted(set(tr) - set(en))
if missing_tr:
    print("Missing in tr.json:", ", ".join(missing_tr))
if missing_en:
    print("Missing in en.json:", ", ".join(missing_en))
if missing_tr or missing_en:
    sys.exit(1)
print(f"OK: {len(en)} keys matched EN/TR")
PY
