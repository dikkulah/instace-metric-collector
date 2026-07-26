# Visual testing toolkit

Route manifest, Stitch design baselines, and scripts for agent visual review + Playwright CI.

## Layout

| Path | Purpose |
|------|---------|
| `manifests/routes.json` | Route → Stitch screen ID → checklist |
| `baselines/` | Stitch reference PNGs (design source) |
| `capture.sh` | Health check + print test URLs |
| `download_baselines.sh` | Fetch Stitch PNGs from `/tmp/stitch_gen_*_v2.log` |

## Quick start

```bash
make ui-visual-serve    # DEMO_MODE agent on :18081 (background)
make ui-visual-routes   # Print URLs from routes.json

# Playwright (from repo root)
make ui-e2e             # Run visual/interaction tests
make ui-e2e-update      # Update Playwright snapshots (maintainers)
```

## Agent visual review

1. Build: `make ui-build && make build`
2. Serve: `make ui-visual-serve`
3. In Cursor: invoke `ui-visual-review` skill or `@visual-reviewer`
4. Compare app screenshots to `baselines/` using checklist in `manifests/routes.json`

## Baselines

Download or refresh Stitch exports:

```bash
./tool/visual/download_baselines.sh
```

See [docs/VISUAL_TESTING.md](../../docs/VISUAL_TESTING.md) for full workflow.
