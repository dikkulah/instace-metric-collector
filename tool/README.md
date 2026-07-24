# tool/ — dev and CI scripts

| Script | Purpose |
|--------|---------|
| `ensure_dev_requirements.sh` | Check Java 21, Maven wrapper, optional Docker |
| `ci_local.sh` | Local CI (`--fast` = tests only; default = smoke) |
| `smoke_local.sh` | Package JAR, run briefly, assert JSON log payload |
| `onboard.sh` | First-time setup (`PROFILE=app` or `PROFILE=full`) |
| `setup_git_hooks.sh` | Enable pre-push hook via `core.hooksPath` |
| `git_hooks/pre-push` | Runs `./mvnw -B -q test` before push |
| `i18n_lint.sh` | Locale JSON key parity (`en` vs `tr`) — Phase 3+ |

## Quick usage

```bash
make onboard          # interactive setup
PROFILE=app make onboard
make ci-fast          # daily check
make ci-smoke         # before merge to main
```
