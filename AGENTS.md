# instance-metric-collector — Agent instructions

## Council

Council gate + domain rules in `.cursor/rules/`. **21 veto rules (V1–V21)** — stop and ask user if violated.

## Key constraints

- OS-specific logic stays in `go/internal/collector/` with GOOS build tags (V1)
- Docker is optional — app must start with `DOCKER_ENABLED=false` (V4)
- JSON payload contract stable — breaking changes need ADR (V6, V7)
- HTTP push and actuator exposure are phase-gated (V12, V13)
- Dashboard UI via snapshot store + REST/SSE, not log parsing (V16–V19)
- UI strings via locale JSON only — EN + TR (V20)
- Agent must not strain the host — bounded collect path, hub-first heavy logic (V21, ADR-013)

## Docs

- `docs/PHASE_GATES.md` — phase exit criteria
- `docs/UI_PLAN.md` — dashboard UI plan
- `docs/PRODUCT_SPEC.md` — MVP scope
- `docs/VETO_REGISTRY.md` — Council V1–V21
- `docs/ARCHITECTURE.md` — collectors, scheduling, payload
- `docs/HUB.md` — hub deploy
- `docs/HISTORY_ALERTS_DIAGNOSTICS_PLAN.md` — historic, alerts, diagnostics
- `docs/LOCAL_CI.md` — `make ci-fast` / `make ci-smoke`
- `docs/GO_REWRITE_PLAN.md` — Go phases G0–G7
- `docs/DECISIONS/ADR-008-go-rewrite.md` — Go migration ADR
- `docs/DECISIONS/ADR-009-java-removal.md` — Java removal ADR
- `docs/DECISIONS/ADR-013-agent-lightness.md` — agent footprint principle (V21)
- `CONTRIBUTING.md` — contributor workflow

## Current phase

**Go runtime active** (`go/`). Java removed (ADR-009). Backlog: G5 golden tests, hub push client, Windows collector parity, historic/alerts (G7+).

## Local CI

```bash
make ci-fast # daily
make ci-smoke # before merge to main/master
```

## Multi-agent (Cursor)

Subagents in `.cursor/agents/`; folder routing in `.cursor/rules/agent-routing.md`.

| Area | Subagent |
|------|----------|
| Collectors / Go backend | `collector-backend` |
| Dashboard UI / `go/web/frontend/` | `dashboard-ui` |
| Hub / ingest | `hub-platform` |
| Tests / CI / `tool/` | `test-ci` |
| Verify before merge | `verifier` |
