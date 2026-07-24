# Repo hygiene — what belongs in git

Quick reference. **When in doubt:** if it is generated, local-only, or huge, do not commit.

## Directory map

| Path | In git? | Purpose |
|------|---------|---------|
| `src/` | Yes | Application and test source |
| `tool/` | Yes | Dev/CI scripts |
| `docs/` | Yes | ADRs, architecture, phase gates |
| `.cursor/rules/` | Yes | Council + agent rules (no secrets) |
| `.github/workflows/` | Yes | CI |
| `Makefile` | Yes | Developer shortcuts |
| `target/` | **No** | Maven build output |
| `logs/` | **No** | Onboard logs (gitignored) |

## Do not commit

| Item | Why | Restore |
|------|-----|---------|
| `target/` | Maven build artifacts | `./mvnw package` |
| `metrics-collector.log*` | Runtime log output | Run app |
| `smoke-*.log` | Smoke test output | `make ci-smoke` |
| `*.DS_Store` | macOS junk | — |
| `.idea/`, `*.iml` | IDE state | Per-developer |
| Credentials in `application.properties` | Secrets (V9) | Use env vars / external config |

## Pre-push checklist

```bash
make doctor
make ci-fast
git status   # no target/, logs, secrets
```

See also [`docs/LOCAL_CI.md`](LOCAL_CI.md).
