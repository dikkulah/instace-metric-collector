# ADR-008: Go rewrite (agent + hub)

**Status:** Accepted — user approved Jul 2026  
**Context:** JVM footprint and single-binary distribution matter for MSP, Windows filo, and edge segments. Java/Spring MVP is complete; next major increment is a Go implementation with the same external contracts.

## Decision

Rewrite **agent** and **hub** in Go as the primary runtime. Keep the Java codebase on `master` as reference until Go reaches feature parity, then deprecate Java.

## Goals

| Goal | Target |
|------|--------|
| Agent binary | Single static binary, no JVM |
| Agent RAM | &lt; 30 MB idle (order of magnitude vs Spring Boot) |
| Contract stability | `MetricsPayload` JSON unchanged (V6/V7) |
| UI | Reuse existing static HTML/JS/CSS (embedded `embed.FS`) |
| Hub API | Compatible ingest + agents list + alerts semantics |

## Non-goals (initial Go MVP)

- Multi-tenant / white-label (Phase 8 Java backlog → Go Phase G6+)
- GraalVM native (superseded by Go)
- Breaking dashboard API shapes without ADR

## Repository layout (proposed)

```
go/
├── cmd/
│   ├── agent/          # per-host collector + optional local UI
│   └── hub/            # central ingest + hub.html
├── internal/
│   ├── collector/      # linux, darwin, windows
│   ├── docker/         # optional container collector
│   ├── payload/        # MetricsPayload types + JSON
│   ├── store/          # in-memory snapshot ring
│   ├── hub/            # registry, ingest, alerts
│   └── web/            # HTTP handlers, SSE
├── go.mod
└── Makefile            # go build, cross-compile
```

Java `src/` remains until cutover; UI assets may be copied or symlinked during transition.

## Migration phases

See [`GO_REWRITE_PLAN.md`](../GO_REWRITE_PLAN.md) — **Phase G0** is the first implementation step.

## Consequences

- **Positive:** Smaller deploy artifact, faster cold start, easier Windows MSI/systemd packaging
- **Negative:** Dual maintenance during migration; OS parsers reimplemented; Spring actuator replaced with Go health endpoints
- **Council:** Payload contract (V6/V7) and UI via snapshot store (V16) preserved; HTTP push/hub (V12) reimplemented in Go with same config keys where practical
