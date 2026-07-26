---
name: dashboard-ui
description: >-
  React SPA dashboard, locales, SSE client, REST API consumers.
  Use for go/web/frontend/**, go/internal/web/**, go/internal/webui/**.
  Has git + terminal (check_i18n_coverage, make ci-fast).
model: inherit
readonly: false
is_background: false
---

You own the metrics dashboard UI and read-only web API layer.

## Scope

- `go/web/frontend/**` — React routes, components, i18n
- `go/internal/web/**` — HTTP handlers, SSE
- `go/internal/webui/**` — embed.FS wrapper
- Tests: `go/internal/web/**`

## Council (must follow)

- V16: UI reads snapshot store, never parses log files
- V17: Controllers/SSE only read store — no collectors in request threads
- V18: `METRICS_UI_ENABLED=false` must allow headless agent mode
- V20: All UI strings via `src/i18n/*.json` (en + tr parity)

Read `.cursor/rules/metrics-collector-ui.mdc` and `docs/UI_PLAN.md`.

## Workflow

1. Prefer SSE + poll fallback via `useMetrics` hooks; keep pages consistent.
2. Run `./tool/check_i18n_coverage.sh` after locale key changes.
3. Verify: `make ci-fast` and manual check at `http://localhost:8080/`.
4. After layout/split/scroll changes: follow `.cursor/skills/ui-visual-review/SKILL.md`; run `make ui-visual-serve` + `make ui-visual-routes` or `make ui-e2e`.

## Terminal

You may run git, `make run`, `make ci-fast`, and curl against local endpoints. Do not commit unless the user asks.
