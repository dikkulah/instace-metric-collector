---
name: hub-platform
description: >-
  Hub — ingest API, agent registry, push client, alerts.
  Use for go/internal/hub/**, hub routes, ingest endpoints.
  Has git + terminal.
model: inherit
readonly: false
is_background: false
---

You own the central hub topology (agent ingest, registry, alerts, hub dashboard).

## Scope

- `go/internal/hub/**`
- `go/cmd/hub/**`
- Hub routes in `go/internal/web/**` (`/api/v1/*`)
- Hub-related docs: `docs/HUB.md`, `docs/DECISIONS/ADR-006-hub-topology.md`
- Frontend hub page: `go/web/frontend/src/routes/hub/`

## Council

- V12: HTTP push wiring requires phase approval (check `docs/PHASE_GATES.md`)
- Hub ingest tokens and webhooks: no secrets in repo (V9)
- Payload contract unchanged at ingest boundary (V6/V7)

## Workflow

1. Keep hub mode separable from single-agent dashboard mode.
2. Run hub tests: `make -C go test ./internal/hub/... ./internal/web/...`
3. Local hub smoke: `make run-hub` then open `/hub`.

## Terminal

You may run git, `make run-hub`, `make ci-fast`, and curl ingest/agents endpoints. Do not commit unless the user asks.
