# ADR-005: Disk and network metrics in MetricsPayload

## Status

Accepted — Phase 6

## Context

Collectors already exposed `getDiskUsage()` / `getNetworkUsage()` as raw command output on macOS, but values were not included in `MetricsPayload` (TD-004). Operators need structured disk and network data in the JSON log contract and dashboard.

## Decision

Add **additive** fields to `MetricsPayload`:

- `diskUsage`: array of `DiskUsageInfo` — `mount`, `filesystem`, `totalBytes`, `usedBytes`, `usePercent`
- `networkUsage`: array of `NetworkUsageInfo` — `name`, `bytesReceived`, `bytesSent`

### Collection per OS (V1)

| OS | Disk | Network |
|----|------|---------|
| Linux | `df -B1 -P` | `/proc/net/dev` |
| macOS | `df -k` (parsed to bytes) | `netstat -ib` |
| Windows | `wmic logicaldisk` | PowerShell `Get-NetAdapterStatistics` |

Parsers live in `service/collector/{linux,mac,windows}/` with unit tests on sample output.

### Compatibility (V6–V7)

- New fields appended to the record; existing consumers ignore unknown JSON keys.
- Empty arrays when collection fails or data unavailable.
- No removal or rename of existing fields.

## Consequences

- JSON log lines grow slightly; smoke test asserts presence of `diskUsage` and `networkUsage`.
- Dashboard shows disk usage bars and network byte totals (cumulative, not rates).
- Windows network requires PowerShell 5+ / Win10+ for `Get-NetAdapterStatistics`.
