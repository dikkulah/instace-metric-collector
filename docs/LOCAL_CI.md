# Local CI

Hybrid policy: pre-push hook + GitHub Actions run Go unit tests; smoke stays local.

## Quick commands

| Command | What it runs | ~Time |
|---------|--------------|-------|
| `make ci-fast` | `go test ./...` | ~1 min |
| `make ci-smoke` | tests + build + short agent run + API assertions | ~2 min |
| `make ui-e2e` | Playwright visual/interaction tests (DEMO_MODE) | ~3 min |
| `make check` | same as ci-fast | ~1 min |

Script: `tool/ci_local.sh` (`--fast` for tests only).

## Pre-push hook

Enabled via `make setup-hooks`. Runs `make -C go test` before every `git push`.

## GitHub Actions

- `ci.yml` — UI build + `go test ./...` on push/PR to `main`, `master`, and `development`

Smoke is **not** run in CI (OS/Docker dependent).

## Pre-PR checklist

```bash
make ci-fast          # daily / development PRs
make ci-smoke         # before merge to main/master
make ui-e2e           # UI layout + scroll regression (see docs/VISUAL_TESTING.md)
git status            # no logs / go/bin / node_modules
```

## Onboard profiles

```bash
PROFILE=app make onboard   # setup + hooks + ci-fast
PROFILE=full make onboard  # + smoke test
```
