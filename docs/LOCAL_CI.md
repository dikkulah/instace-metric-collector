# Local CI

Hybrid policy: pre-push hook + GitHub Actions run unit tests; smoke stays local.

## Quick commands

| Command | What it runs | ~Time |
|---------|--------------|-------|
| `make ci-fast` | `./mvnw test` | ~1 min |
| `make ci-smoke` | tests + package + short JAR run + log assertions | ~2 min |
| `make check` | same as ci-fast | ~1 min |

Script: `tool/ci_local.sh` (`--fast` for tests only).

## Pre-push hook

Enabled via `make setup-hooks`. Runs `./mvnw -B -q test` before every `git push`.

## GitHub Actions

- `ci.yml` — `./mvnw -B test` on push/PR to `main` and `development`

Smoke is **not** run in CI (OS/Docker dependent).

## Pre-PR checklist

```bash
make ci-fast          # daily / development PRs
make ci-smoke         # before merge to main
git status            # no logs / target / secrets
```

## Onboard profiles

```bash
PROFILE=app make onboard   # setup + hooks + ci-fast
PROFILE=full make onboard  # + smoke test
```
