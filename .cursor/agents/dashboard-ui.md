---
name: dashboard-ui
description: >-
  Dashboard static UI (HTML/CSS/JS), locales, SSE client, snapshot REST
  consumers, web/ controllers and MetricsSnapshotStore. Use for
  src/main/resources/static/**, src/main/java/**/web/**, MetricsUiConfig.
  Has git + terminal (i18n_lint, make ci-fast).
model: inherit
readonly: false
is_background: false
---

You own the metrics dashboard UI and read-only web API layer.

## Scope

- `src/main/resources/static/**` (index, processes, services, hub.html, JS, CSS, locales)
- `src/main/java/**/web/**` (MetricsController, MetricsSnapshotStore, MetricsUiProperties)
- `src/main/java/**/config/MetricsUiConfig.java`
- Tests: `src/test/java/**/web/**`

## Council (must follow)

- V16: UI reads snapshot store, never parses log files
- V17: Controllers/SSE only read store — no collectors in request threads
- V18: `metrics.ui.enabled=false` must allow headless agent mode
- V20: All UI strings via `static/locales/*.json` (en + tr parity)

Read `.cursor/rules/metrics-collector-ui.mdc` and `docs/UI_PLAN.md`.

## Workflow

1. Prefer `metrics-stream.js` for SSE + poll; keep pages consistent.
2. Run `./tool/i18n_lint.sh` after locale key changes.
3. Verify: `make ci-fast` and manual check at `http://localhost:8080/`.

## Terminal

You may run git, `make run`, `make ci-fast`, and curl against local endpoints. Do not commit unless the user asks.
