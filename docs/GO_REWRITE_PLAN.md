# Go rewrite plan

**Priority:** First major roadmap item after Java MVP (user decision, Jul 2026).  
**ADR:** [ADR-008-go-rewrite.md](DECISIONS/ADR-008-go-rewrite.md)

Java implementation stays on `master` as reference until Go reaches parity. New work lands under `go/` unless a hotfix is required in Java.

---

## Principles

1. **Contract first** — `MetricsPayload` JSON and `/api/metrics/*` shapes match Java (additive only).
2. **Strangler** — Run Go agent beside Java hub (or vice versa) only after ingest contract tests pass.
3. **React SPA UI** — `go/web/frontend` (Vite + React + TypeScript + Tailwind); Stitch design tokens; embedded via `go/internal/webui` (`embed.FS`). Legacy Java static assets remain reference-only under `src/main/resources/static/`.
4. **OS logic in collectors only** (V1) — `internal/collector/{linux,darwin,windows}/`.
5. **Docker optional** (V4) — `docker.enabled=false` must start cleanly.
6. **Historic: store rich first** — ingest tam `MetricsPayload`; prod’da `metrics.history.profile` ile retention/rollup kısılır, alan atılmaz (Phase G7 / Phase 10).

---

See [`GO_REWRITE_STEPS.md`](GO_REWRITE_STEPS.md) for per-phase **build / run / verify** commands.

## Phase G0 — Scaffold (first step)

| Task | Done |
|------|------|
| `go mod init` + module layout (`cmd/agent`, `cmd/hub`) | [x] |
| Config loader (env + YAML/properties parity for key flags) | [x] |
| Structured logging (JSON log line compatible with log shipper) | [x] |
| `make go-build`, `make go-test` in root Makefile | [x] |
| CI job: `go test ./...` | [x] |
| README section: Go quick start | [x] |

**Exit:** `go run ./cmd/agent` starts, logs heartbeat, exits cleanly on SIGTERM.

---

## Phase G1 — Payload + scheduler

| Task | Done |
|------|------|
| `payload.MetricsPayload` record matching Java fields | [ ] |
| Golden JSON fixture tests (Java sample → Go parse/serialize) | [ ] |
| Ticker scheduler (`metrics.collection.interval`) | [ ] |
| Log output: one JSON line per tick (Phase 1 parity) | [ ] |

**Exit:** Golden tests pass; log line byte-compatible with Java samples.

---

## Phase G2 — OS collectors

| Task | Done |
|------|------|
| Linux: CPU, memory, processes, services, disk, network | [ ] |
| macOS (darwin): same surface | [ ] |
| Windows: same surface | [ ] |
| Build tags / runtime GOOS selection | [ ] |
| Parser unit tests per OS (port from Java test vectors) | [ ] |

**Exit:** `make go-test` green on dev machine (darwin); Linux CI matrix.

---

## Phase G3 — Docker collector (optional)

| Task | Done |
|------|------|
| docker.sock client (moby/moby or equivalent) | [ ] |
| Compose watchdog labels (parity with Java) | [ ] |
| Separate collection interval + cache | [ ] |
| `docker.enabled=false` — no docker imports in hot path | [ ] |

---

## Phase G4 — Local dashboard API + React SPA

| Task | Done |
|------|------|
| **F0** Vite + React + TS + Tailwind scaffold, Stitch tokens | [x] |
| **F1** `go/internal/webui` embed + `make ui-build` | [x] |
| **F2** `GET /api/meta`, Vite dev proxy, mode-aware nav | [x] |
| **F3** Dashboard route (Overview, SSE, i18n) | [x] |
| **F4** Processes + Services routes + deep-links | [x] |
| **F5** Containers + Container Metrics (Stitch v2 layout) | [x] |
| **F6** Hub route + `/api/v1/agents` | [x] |
| **F7** Responsive layout + EN/TR coverage script | [x] |
| In-memory snapshot ring (`metrics.ui.history.size`) | [x] |
| REST: `/api/metrics/current`, `/history`, `/config` | [x] |
| SSE: `/api/metrics/stream` | [x] |
| `metrics.ui.enabled=false` headless mode | [x] |

**Exit:** Browser dashboard works against Go agent; SSE + poll fallback. See [`go/web/frontend/README.md`](../go/web/frontend/README.md).

---

## Phase G5 — Hub + push + alerts

| Task | Done |
|------|------|
| Hub: `POST /api/v1/ingest`, agent registry | [ ] |
| Agent push client (`metrics.push.*`) | [ ] |
| `hub.html` + hub API | [ ] |
| Webhook alerts (CPU/RAM/container thresholds) | [ ] |
| Contract tests vs Java hub (optional dual-run) | [ ] |

---

## Phase G6 — Deploy + cutover

| Task | Done |
|------|------|
| Multi-stage Dockerfile (distroless or alpine + binary) | [ ] |
| `docker-compose.yml` for agent + hub | [ ] |
| Cross-compile: linux/amd64, linux/arm64, darwin, windows | [ ] |
| Document Java deprecation timeline | [ ] |
| Tag `v2.0.0-go` when parity checklist complete | [ ] |

---

## Phase G7 — Historic store (full payload first)

Go hub (G5) sonrası; Phase 10 ile hizalı. **İlke:** ingest tam `MetricsPayload`; prod’da yalnızca retention/rollup kısılır.

| Task | Done |
|------|------|
| `internal/history/` SQLite + migrations | [ ] |
| Tier 0 `raw_samples`: `payload_json` NOT NULL + metadata | [ ] |
| `metrics.history.profile` (`full` default, `standard`, `minimal`) | [ ] |
| Hourly/daily rollup jobs (Tier 0 silinmeden önce) | [ ] |
| History API: `GET /api/v1/agents/{id}/history` | [ ] |
| (G7b) Normalized `process_samples` / `service_samples` / `container_samples` | [ ] |

**Exit:** Ingest → tam JSON persist; `full` profile ile drill-down; prod `minimal` yalnızca retention kısar.

**Detay:** [`HISTORY_ALERTS_DIAGNOSTICS_PLAN.md`](HISTORY_ALERTS_DIAGNOSTICS_PLAN.md)

---

## Parity checklist (Java → Go)

| Area | Java | Go |
|------|------|-----|
| JSON log payload | ✓ | G1 |
| Mac/Linux/Win collectors | ✓ | G2 |
| Docker containers | ✓ | G3 |
| Dashboard + i18n | ✓ | G4 (React SPA F0–F7) |
| Hub + push + alerts | ✓ | G5 |
| Historic store (full payload) | — | G7 |
| Actuator/health | ✓ | G6 (`/health` or `/live`) |
| `make ci-fast` equivalent | ✓ | `make go-ci` |

---

## Deferred from Java backlog (re-prioritize after G5)

- Phase 10 historic UI + Java hub persist (opsiyonel) — **asıl store Go G7**
- Phase 11 alert platform
- Phase 8 multi-tenant
- Phase 9 Windows MSI / systemd installers (easier in Go)

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Windows collector parity | Port Java test vectors early; CI on windows-latest |
| SSE/Jackson edge cases | Fix Java reference (JavaTimeModule); Go `encoding/json` + RFC3339 timestamps |
| Dual codebases | Time-box Java to hotfixes only after G4 |
| UI drift | Single static asset source; embed from one directory |
| Disk/bandwidth growth | Tiered retention + profiles; ingest always full in `full` profile |
