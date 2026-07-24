# instance-metric-collector — Agent instructions

## Council

Council gate + domain rules in `.cursor/rules/`. **20 veto rules (V1–V20)** — stop and ask user if violated.

## Key constraints

- OS-specific logic stays in `service/collector/{linux,mac,windows}/` (V1)
- Docker is optional — app must start with `docker.enabled=false` (V4)
- JSON log output is the external contract — breaking payload changes need ADR (V6, V7)
- HTTP push and actuator exposure are phase-gated (V12, V13)
- Dashboard UI is phase-gated — snapshot store + REST/SSE, not log parsing (V16–V19)
- UI strings via locale JSON only — EN + TR in Phase 3 (V20)

## Docs

- `docs/PHASE_GATES.md` — phase exit criteria
- `docs/UI_PLAN.md` — Phase 3 dashboard UI plan
- `docs/PRODUCT_SPEC.md` — MVP kapsamı ve pazar konumlandırması
- `docs/MARKET_SCENARIOS.md` — müşteri segmentleri ve senaryolar
- `docs/VETO_REGISTRY.md` — Council V1–V20 canonical list
- `docs/ARCHITECTURE.md` — strategy pattern, scheduling, payload
- `docs/HUB.md` — Phase 7 hub deploy
- `docs/HISTORY_ALERTS_DIAGNOSTICS_PLAN.md` — Phase 10–12 (historic, alerts, diagnostics)
- `docs/LOCAL_CI.md` — `make ci-fast` / `make ci-smoke`
- `docs/REPO_HYGIENE.md` — what not to commit
- `docs/BRANCHES.md` — development vs main
- `docs/TECH_DEBT.md` — known debt items
- `docs/DECISIONS/` — ADRs
- `CONTRIBUTING.md` — contributor workflow

## Current phase

**MVP-1 + MVP-2 complete** (Phases 1–7, 4–6). **Next planned:** Phase 10 Historic → 11 Alerts → 12 Diagnostics — see `docs/HISTORY_ALERTS_DIAGNOSTICS_PLAN.md`. Phase 8–9 (multi-tenant, watchdog) remain MVP-3 backlog.

## Local CI

```bash
make ci-fast    # daily
make ci-smoke   # before merge to main
```

## Multi-agent (Cursor)

Subagents live in `.cursor/agents/`; folder routing in `.cursor/rules/agent-routing.mdc`. See `.cursor/agents/README.md`.

| Area | Subagent |
|------|----------|
| Collectors / Java backend | `collector-backend` |
| Dashboard UI / `web/` | `dashboard-ui` |
| Hub / ingest / alerts | `hub-platform` |
| Tests / CI / `tool/` | `test-ci` |
| Verify before merge | `verifier` |

Example: `@dashboard-ui SSE offline sorununu düzelt` or open files under `static/` so UI rules auto-attach.
