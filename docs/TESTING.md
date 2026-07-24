# Testing

## Layers

| Layer | Command | Location |
|-------|---------|----------|
| Unit | `make test` / `./mvnw test` | `src/test/java/` |
| Context smoke | `@SpringBootTest` | `InstanceMetricCollectorApplicationTests` |
| Integration smoke | `make ci-smoke` | `tool/smoke_local.sh` |

## Unit tests

Current coverage:

- `InstanceMetricsSenderTest` — payload assembly, optional Docker, memory calculation
- `DockerContainerCollectorTest` — container mapping, error handling, skip removing
- `DockerClientConfigTest` — `resolveDockerHost()` helper

Test config: `src/test/resources/application.properties` sets `docker.enabled=false`.

## Smoke test

`tool/smoke_local.sh`:

1. Runs unit tests
2. Packages JAR
3. Starts app for ~12 seconds (configurable via `SMOKE_WAIT_SECS`)
4. Asserts log contains `cpuLoad`, `usedMemory`, `processInfos`, `serviceInfos`, `containers`

Docker is enabled in smoke only if daemon is reachable; otherwise runs host-only (see [`CI_LESSONS.md`](CI_LESSONS.md) Lesson 1).

## Adding tests (V14)

New collector logic must include unit tests. Prefer Mockito for shell/OS dependencies; avoid requiring real Docker in unit tests.

## CI mapping

| Check | Local | GitHub Actions |
|-------|-------|----------------|
| Unit tests | `make ci-fast`, pre-push | `ci.yml` |
| Smoke | `make ci-smoke` | Not run (local only) |
