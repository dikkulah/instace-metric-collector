# ADR-003: Metrics Dashboard UI (Static + REST/SSE)

## Status

Proposed — Phase 3 gate pending user approval (V19)

## Context

Phase 1 agent writes `MetricsPayload` JSON to logs only. Operators need a **user-friendly, continuously updating** view of host metrics without tailing log files or external tools.

Options considered:

1. **Parse log file in UI** — fragile, laggy, couples UI to log format
2. **Grafana + Loki/Prometheus** — powerful but external stack, heavy for single-host agent
3. **Embedded dashboard** — in-process snapshot store + REST/SSE + static HTML
4. **Thymeleaf server-rendered pages** — adds template dependency
5. **React/Vue SPA** — separate frontend build pipeline

## Decision

**Embedded static dashboard with in-memory snapshot store and REST/SSE API.**

### Data flow

1. `InstanceMetricsSender` builds `MetricsPayload` (unchanged collector logic)
2. Writes to `MetricsSnapshotStore` (new) — latest + ring buffer of history
3. Continues JSON log output (ADR-002 unchanged)
4. `MetricsController` serves read-only API from store
5. `src/main/resources/static/index.html` consumes API via fetch + EventSource (SSE)

### Technology

- **Backend:** Spring `@RestController`, optional `SseEmitter`
- **Frontend:** Vanilla HTML/CSS/JS in `static/` — no npm/webpack
- **Charts:** Lightweight CSS bars or Chart.js CDN (optional, no commit of node_modules)
- **Feature flag:** `metrics.ui.enabled` (default `true` when Phase 3 ships; `false` for headless)

### Package layout

```
web/
  MetricsController.java
  MetricsSnapshotStore.java
  dto/MetricsSnapshot.java   # payload + collectedAt
resources/static/
  index.html
  css/dashboard.css
  js/dashboard.js
```

## Consequences

**Positive:**
- Single JAR deployment — `make run` → open browser
- Real-time updates without log parsing
- Reuses existing `MetricsPayload` contract (V6/V7)
- Aligns with `spring-boot-starter-web` already on classpath

**Negative:**
- Exposes metrics on HTTP port — security review needed for non-local deploy
- In-memory history lost on restart (acceptable for dashboard)
- Slight memory overhead for ring buffer

**Neutral:**
- Phase 2 HTTP push remains independent (external vs local UI)
- Actuator (Phase 4) serves ops probes; dashboard serves human UX

## Alternatives rejected

| Alternative | Reason |
|-------------|--------|
| Log tail UI | Breaks V16; fragile |
| Full SPA framework | Over-engineering for Phase 3 scope |
| WebSocket only | SSE sufficient for one-way metric push |

## References

- `docs/UI_PLAN.md`
- V16–V19 in `docs/VETO_REGISTRY.md`
- ADR-002 log-first output (dual write: log + store)
