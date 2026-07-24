# Branches

## Policy

| Branch | Purpose | Minimum CI before merge |
|--------|---------|-------------------------|
| `development` | Daily integration, feature work | `make ci-fast` |
| `main` | Milestone releases, stable snapshots | `make ci-smoke` |

## Workflow

1. Feature branches merge into `development` after `make ci-fast`.
2. Milestone PRs: `development` → `main` after `make ci-smoke`.
3. Pre-push hook runs `mvn test` automatically (if hooks enabled via `make setup-hooks`).

## GitHub Actions

- `ci.yml` runs on push/PR to both `main` and `development`.

## Tags

Tag releases from `main` after `make ci-smoke` passes locally.
