# ADR-014: Persistent agent catalog and offline access

**Status:** Accepted (Jul 2026)  
**Council:** V6, V16, V20, V21

## Context

The hub `Registry` is in-memory only. After a hub restart or when an agent stops pushing, agents disappear from the UI even though historic samples remain in SQLite (`raw_samples`). Drill-down `/current` returned 204 for offline agents with no live ring buffer.

Operators need to see all known agents, distinguish live vs offline, and browse historic data for agents that are no longer pushing.

## Decision

### Persistent catalog

Add `hub_agents` table in the history SQLite store:

- `agent_id`, `hostname`, `first_seen`, `last_seen`
- Last-known summary fields (`last_cpu`, memory, container count)

`UpsertAgent` runs **async** on ingest (same goroutine as `WriteSample`), not on the agent collect path (V21).

On hub boot, `Registry.Hydrate` seeds summaries from `ListKnownAgents`. Snapshot ring buffers stay empty until new ingest.

`BackfillAgentCatalog` migrates existing `raw_samples` rows on store open.

### Status model (additive API)

Server computes `status` per agent:


| Status    | Condition                         |
| --------- | --------------------------------- |
| `live`    | `now - lastSeen < staleAfter`     |
| `stale`   | `staleAfter ≤ age < offlineAfter` |
| `offline` | `age ≥ offlineAfter`              |


- `staleAfter` — existing alert stale window (`AlertConfig.StaleAfter`)
- `offlineAfter` — new env `METRICS_HUB_OFFLINE_AFTER` (default `24h`)

`GET /api/v1/agents` merges catalog + live registry and returns additive fields: `status`, `firstSeen`.

`GET /api/v1/agents/{id}/current` falls back to `LatestSample` from SQLite when the registry ring is empty; sets `X-Agent-Status` header.

`GET /api/v1/hub/config` adds `offlineAfterMs`.

### UI

- Hub grid uses server `status`; filters: All | Live | Offline (stale grouped with offline)
- Sidebar shows offline agents with muted indicator
- Offline/stale drill-down auto-switches to History mode with "Last data" banner

## Consequences

- Agents with historic data reappear after hub restart without waiting for a new push
- Offline agents remain clickable; historic charts and tables stay accessible
- No agent-side persistence added (hub remains source of truth)

## Out of scope

- Agent archive/delete UI
- Agent rename/alias
- Normalized `process_samples` (G7b)

## Alternatives considered


| Option                             | Rejected because                                                    |
| ---------------------------------- | ------------------------------------------------------------------- |
| Registry-only with TTL eviction    | Loses identity on restart; no historic drill-down                   |
| Separate catalog DB                | Extra operational surface; history store already owns agent samples |
| Client-side offline detection only | Inconsistent after restart; no `/current` fallback                  |


