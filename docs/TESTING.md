# Testing

## Layers

| Layer | Command | Location |
|-------|---------|----------|
| Unit | `make test` / `make -C go test` | `go/internal/**` |
| Integration smoke | `make ci-smoke` | `tool/smoke_local.sh` |

## Unit tests

Current coverage:

- `internal/collector` — service status parsing, factory
- `internal/config` — env defaults
- `internal/logoutput` — JSON log line writer
- `internal/payload` — golden fixture round-trip
- `internal/runtime` — graceful shutdown
- `internal/web` — REST handlers

## Smoke test

`tool/smoke_local.sh`:

1. Runs `go test ./...`
2. Builds agent binary (includes UI)
3. Starts agent for ~12 seconds (`SMOKE_WAIT_SECS`)
4. Asserts REST `/api/metrics/current` payload fields
5. Asserts `LOGGING_FILE_NAME` contains `cpuLoad`, `usedMemory`, `processInfos`

Docker is enabled in smoke only if daemon is reachable; otherwise runs host-only (see [`CI_LESSONS.md`](CI_LESSONS.md)).

## Adding tests (V14)

New collector logic must include unit tests. Prefer table-driven tests with fixtures; avoid requiring real Docker in unit tests.

## CI mapping

| Check | Local | GitHub Actions |
|-------|-------|----------------|
| Unit tests | `make ci-fast`, pre-push | `ci.yml` |
| Smoke | `make ci-smoke` | Not run (local only) |

## Clean generated artifacts

```bash
make clean
```
