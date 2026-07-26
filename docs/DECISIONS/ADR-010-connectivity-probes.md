# ADR-010: Connectivity probes in MetricsPayload

**Status:** Accepted (Jul 2026)  
**Phase:** 13 / G5.1 additive extension

## Context

Operators need to distinguish host resource issues from network/application reachability failures. Phase 13 adds optional connectivity probes to the agent payload.

## Decision

Add optional additive field to `MetricsPayload`:

```json
"connectivityProbes": [
  { "target": "api.internal:443", "ok": true, "latencyMs": 12 },
  { "target": "https://status.example/health", "ok": false, "error": "timeout" }
]
```

- Collected by `go/internal/probe` (TCP host:port or HTTP GET URLs)
- Configured via `METRICS_PROBE_TARGETS` (comma-separated) and `METRICS_PROBE_TIMEOUT`
- Hub diagnostics engine emits `CONNECTIVITY_FAIL` insights when `ok=false`

## Consequences

- V6 compliant: field is optional; omit when no probes configured
- OS probe logic stays out of collectors (probe package uses net/http only)
- No remote execution on agents beyond outbound connect checks
