#!/usr/bin/env bash
# Download Stitch screenshot PNGs into tool/visual/baselines/ (one-time / refresh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/tool/visual/baselines"
MANIFEST="$ROOT/tool/visual/manifests/routes.json"
mkdir -p "$OUT"

python3 - "$MANIFEST" "$OUT" <<'PY'
import json, glob, os, sys

manifest_path, out_dir = sys.argv[1], sys.argv[2]
manifest = json.load(open(manifest_path))
id_to_baseline = {r["stitchId"]: r["baseline"] for r in manifest["routes"]}
found = {}

def walk_screens(obj):
    if isinstance(obj, dict):
        sid = obj.get("id")
        shot = obj.get("screenshot")
        if isinstance(sid, str) and isinstance(shot, dict):
            url = shot.get("downloadUrl")
            if url:
                found[sid] = url
        for v in obj.values():
            walk_screens(v)
    elif isinstance(obj, list):
        for item in obj:
            walk_screens(item)

for log_path in glob.glob("/tmp/stitch_gen_*_v2.log"):
    try:
        raw = open(log_path, "r", encoding="utf-8").read().strip()
        if raw.endswith("EXIT:0"):
            raw = raw[: raw.rfind("EXIT:0")].strip()
        data = json.loads(raw)
        walk_screens(data)
    except (OSError, json.JSONDecodeError) as e:
        print(f"WARN {log_path}: {e}", file=sys.stderr)

for sid, baseline in id_to_baseline.items():
    url = found.get(sid)
    if not url:
        print(f"SKIP {baseline}: no screenshot URL for {sid}")
        continue
    dest = os.path.join(out_dir, baseline)
    print(f"GET {baseline}")
    try:
        import urllib.request
        urllib.request.urlretrieve(url, dest)
    except Exception as e:
        print(f"FAIL {baseline}: {e}", file=sys.stderr)

print(f"Done. Files in {out_dir}")
PY
