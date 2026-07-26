# Multi-agent setup (instance-metric-collector)

Cursor uses **two layers**:

1. **Rules** (`.cursor/rules/*.mdc`) — context injected when matching files are open (`globs`).
2. **Subagents** (`.cursor/agents/*.md`) — specialists the main Agent can delegate to.

## Subagents

| Agent | Folder focus | Writes? |
|-------|----------------|--------|
| `collector-backend` | `go/internal/collector/`, runtime, payload | yes |
| `dashboard-ui` | `go/web/frontend/`, `go/internal/web/` | yes |
| `hub-platform` | `go/internal/hub/`, ingest | yes |
| `test-ci` | `go/**/*_test.go`, `tool/`, CI | yes |
| `verifier` | review only | no (terminal OK) |

## Usage examples

```
@collector-backend darwin servis parser'ını düzelt, make ci-fast çalıştır
```

```
@dashboard-ui processes tablosuna arama ekle; i18n coverage geçsin
```

## Git + terminal

All write agents may run `git`, `make`, `go test`, and curl. Commits only when the user asks.

## Backend ↔ UI

User-facing API or config changes require matching dashboard work in the same task. Rule: `.cursor/rules/backend-ui-parity.mdc`.
