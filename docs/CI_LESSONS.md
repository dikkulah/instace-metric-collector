# CI lessons

Post-mortems and patterns for local CI and smoke tests. Add a lesson after every CI/smoke failure.

## Lesson 1 — Docker is optional in smoke

**Context:** Smoke test must pass on machines without Docker daemon.

**Fix:** `tool/smoke_local.sh` probes `docker info`; sets `docker.enabled=false` when unreachable. Payload still must include `"containers":[]`.

**Checklist for new smoke assertions:**
- [ ] Works with `docker.enabled=false`
- [ ] Works with `docker.enabled=true` when daemon is up
- [ ] Does not require a specific OS beyond dev machine

## Lesson 2 — Avoid port 8080 conflicts in smoke

**Context:** Smoke failed when another process already bound port 8080 (Spring Boot default).

**Fix:** `tool/smoke_local.sh` passes `--server.port=${SMOKE_SERVER_PORT:-0}` so the app binds an ephemeral port during smoke.

**Checklist:**
- [ ] Smoke does not assume port 8080 is free
- [ ] Override with `SMOKE_SERVER_PORT=18080` if needed

## Template for new lessons

### Lesson N — Title

**Context:** What failed?

**Fix:** What changed?

**Checklist:**
- [ ] Item 1
