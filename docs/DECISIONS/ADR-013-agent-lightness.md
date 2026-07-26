# ADR-013: Agent must not strain the host

**Status:** Accepted (Jul 2026)  
**Council:** V21

## Context

Outpost agents run on production hosts alongside workloads. If collection, probes, or local persistence block the host or consume unbounded CPU/RAM, the monitor becomes part of the incident.

## Decision

### North star

> The agent must not strain the instance it runs on and must never become the bottleneck.

### Agent vs hub

| Work | Runs on |
|------|---------|
| OS metrics, process top-N, optional Docker cache, connectivity probes | **Agent** |
| SQLite history, rollup, retention, alert engine, sustained rules, diagnostics trends | **Hub** |

New features default to **hub-first** unless they are strictly local OS facts.

### Hard rules (V21)

1. **Non-blocking collect path** — no network I/O, SQLite, or webhook on the main ticker goroutine (async queue/goroutine only).
2. **Bounded work per tick** — caps on process list, probe targets, command line length, ring buffer size.
3. **Configurable intervals** — default collection ≥ 30s in production docs; dev may use 5s.
4. **Graceful degradation** — collector errors warn and continue (V11).
5. **Self-visibility** — optional `agentMemoryBytes`, `agentGoroutines`, `collectDurationMs` on payload (additive V6).

### Soft targets (not CI-enforced yet)

| Metric | Target (idle host, UI off, push on) |
|--------|-------------------------------------|
| Agent RSS | < 80 MB typical |
| Collect duration | < 2s p95 on 8-core host |
| CPU overhead | < 1% average at 60s interval |

## Consequences

- P11 sustained rules and P12 trend extrapolation stay on hub ingest/history.
- G7b normalized samples are hub-only unless explicitly approved with footprint ADR update.
- Future agent features require a V21 checklist in PR description.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Agent-side SQLite history | Duplicates hub; increases disk/CPU on every host |
| Unlimited process list | O(n) gopsutil calls per tick on large hosts |
| Sync push on collect path | Network stalls delay next sample |
