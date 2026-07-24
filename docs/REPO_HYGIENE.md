# Repo hygiene — what belongs in git

Quick reference. **When in doubt:** if it is generated, local-only, or huge, do not commit.

## Directory map

| Path | In git? | Purpose |
|------|---------|---------|
| `go/` | Yes | Go agent, hub, collectors, embedded UI source |
| `go/web/frontend/` | Yes | React SPA source |
| `tool/` | Yes | Dev/CI scripts |
| `docs/` | Yes | ADRs, architecture, phase gates |
| `.cursor/rules/` | Yes | Council + agent rules (no secrets) |
| `.cursor/mcp.json` | Yes | Shared MCP config (no tokens) |
| `.github/workflows/` | Yes | CI |
| `Makefile` | Yes | Developer shortcuts |
| `go/bin/` | **No** | Built binaries |
| `go/internal/webui/dist/` | **No** | Built SPA (CI builds on demand) |
| `go/web/frontend/node_modules/` | **No** | npm deps |
| `logs/` | **No** | Onboard logs (gitignored) |

## Do not commit

| Item | Why | Restore |
|------|-----|---------|
| `go/bin/` | Built binaries | `make build` |
| `go/internal/webui/dist/` | Built SPA | `make ui-build` |
| `metrics-collector.log*` | Runtime log output | Run app |
| `smoke-*.log` | Smoke test output | `make ci-smoke` |
| `*.DS_Store` | macOS junk | — |
| `.idea/`, `*.iml` | IDE state | Per-developer |
| Credentials in env files | Secrets (V9) | Use env vars / external config |
| `~/.config/instance-metric-collector/stitch_api_key` | Stitch API key | `./tool/setup_stitch_mcp.sh` |
| `.cursor/mcp.github.json` with PAT | Tokens | Copy from `.cursor/mcp.github.example.json` |

## Pre-push checklist

```bash
make doctor
make ci-fast
git status   # no go/bin, logs, secrets
```

See also [`docs/LOCAL_CI.md`](LOCAL_CI.md).
