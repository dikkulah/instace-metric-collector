# ADR-011: Alert lifecycle and notification channels

**Status:** Accepted (Jul 2026)  
**Phase:** 11 / P11

## Context

Phase 7 webhook alerts cover threshold firing only. MSP and homelab operators need alert history, acknowledgement, silence, and multiple notification channels. `internal/alert` already persists events via `history.Store.SaveAlertEvent`.

## Decision

### Alert lifecycle

States: `OPEN` → `ACK` → `RESOLVED`.

- New threshold breach creates `OPEN` event (existing dedup/cooldown unchanged).
- `POST /api/v1/alerts/{id}/ack` transitions to `ACK` (additive API).
- Auto-`RESOLVED` when metric returns below threshold for sustained window (P11; initial: manual resolve endpoint optional).
- All transitions persisted in `alert_events` with `status` column (existing schema).

### Notification channels

Extend `alert.Notifier` interface — one implementation per channel:

| Channel | P11 scope |
|---------|-----------|
| Webhook | ✅ existing |
| Slack | ✅ new |
| Discord | ✅ new |
| SMTP email | ✅ new |

Configuration via hub `alert-config` REST (existing `ConfigStore`); secrets in env or hub settings — never logged (V10).

### Webhook payload v2

Additive fields only (`status`, `alertId`, `acknowledgedAt`); v1 consumers ignore unknown fields (V6/V7).

## Consequences

- Phase 11 UI (`AlertsPage`) gains filter + ack/silence actions; i18n EN+TR (V20).
- Silence: agent+rule mute window stored in hub settings; engine skips notify while active.
- Sustained conditions (`avg > x for 5m`) added in P11 rules — requires short rolling window in `EvalContext`, not ML.
- AI-generated alert summaries or root-cause text — **out of scope**; deferred to post-MVP-4 with separate ADR.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| 90+ channels like Uptime Kuma | Scope creep; webhook + 3 channels covers most homelab/MSP |
| External incident tool only | Self-hosted value proposition weakens |
| ML-based alert grouping | Contradicts rule-based P12 diagnostics plan |
