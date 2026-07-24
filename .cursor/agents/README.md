# Multi-agent setup (instance-metric-collector)

Cursor does not assign a fixed agent per file in the UI. This repo uses **two layers**:

1. **Rules** (`.cursor/rules/*.mdc`) — context injected when matching files are open (`globs`).
2. **Subagents** (`.cursor/agents/*.md`) — specialists the main Agent can delegate to (own context, git + shell).

## Subagents

| Agent | Folder focus | Writes? |
|-------|----------------|--------|
| `collector-backend` | `service/collector/`, models, sender | yes |
| `dashboard-ui` | `static/`, `web/` | yes |
| `hub-platform` | `hub/`, ingest, alerts | yes |
| `test-ci` | `src/test/`, `tool/`, CI | yes |
| `verifier` | review only | no (terminal OK) |

Built-in agents (`explore`, `bash`, `browser`) still apply automatically.

## Usage examples

```
@collector-backend macOS ağ parser'ını düzelt, make ci-fast çalıştır
```

```
@dashboard-ui processes tablosuna komut kısaltma ekle; i18n_lint geçsin
```

```
@verifier son değişiklikleri doğrula, council ihlali var mı bak
```

## Per-folder rules (globs)

Rules with `globs` auto-attach when you work on matching paths — no manual @ needed.

## Git + terminal

All write agents (`readonly: false`) may run `git`, `make`, `./mvnw`, and curl. Commits only when the user asks.

## Add a new agent

Create `.cursor/agents/my-agent.md`:

```yaml
---
name: my-agent
description: When to use this agent (be specific — parent reads this).
model: inherit
readonly: false
is_background: false
---
```

Add a row to `agent-routing.mdc` and optional `globs` in `.cursor/rules/`.
