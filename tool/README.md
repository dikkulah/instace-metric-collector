# tool/ — dev and CI scripts

| Script | Purpose |
|--------|---------|
| `ensure_dev_requirements.sh` | Check Go 1.22+, Node 22+, optional Docker |
| `ci_local.sh` | Local CI (`--fast` = tests only; default = smoke) |
| `smoke_local.sh` | Build agent, run briefly, assert REST payload |
| `onboard.sh` | First-time setup (`PROFILE=app` or `PROFILE=full`) |
| `setup_git_hooks.sh` | Enable pre-push hook via `core.hooksPath` |
| `git_hooks/pre-push` | Runs `make -C go test` before push |
| `check_i18n_coverage.sh` | Locale JSON key parity (`en` vs `tr`) |
| `run_stitch_mcp.sh` | Google Stitch MCP wrapper (Cursor UI design) |
| `setup_stitch_mcp.sh` | One-time Stitch API key setup |

## Stitch MCP (UI design)

```bash
./tool/setup_stitch_mcp.sh   # ilk kurulum
# Cursor → Reload Window → MCP panelinde stitch yeşil
```

Key dosyası: `~/.config/instance-metric-collector/stitch_api_key` (commit edilmez).

Stitch proje: [Instance Metric Collector](https://stitch.withgoogle.com/projects/3503001314210425983)

## Quick usage

```bash
make onboard          # interactive setup
PROFILE=app make onboard
make ci-fast          # daily check
make ci-smoke         # before merge to main
```
