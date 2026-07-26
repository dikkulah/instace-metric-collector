---
name: ui-visual-review
description: >-
  Run visual UI review for the React dashboard after layout or Stitch-related
  changes. Use when go/web/frontend changes, scroll/split-view bugs, or before
  merge when UI behavior is in scope. Combines ce-test-browser, routes manifest,
  and Stitch baselines.
---

# UI Visual Review (instance-metric-collector)

## When to use

- `go/web/frontend/**` or `go/internal/webui/**` changed
- Master-detail scroll, split ratio, or container nested layout touched
- User reports “detail panel not visible” or stale container UI
- Before merge when verifier requests visual evidence

## Prerequisites

```bash
make ui-build && make build
make ui-visual-serve    # DEMO_MODE on :18081
make ui-visual-routes
```

Manifest: `tool/visual/manifests/routes.json`  
Baselines: `tool/visual/baselines/*.png`  
Docs: `docs/VISUAL_TESTING.md`

## Workflow

### 1. Scope routes

Map changed files to routes:

| Files | Routes |
|-------|--------|
| `routes/dashboard/**` | `/` |
| `routes/processes/**`, `ProcessSplitView` | `/processes` |
| `routes/services/**`, `ServiceSplitView` | `/services` |
| `routes/containers/**` | `/containers` (1440 + 390) |
| `routes/container-metrics/**` | `/container-metrics?id=abc123def456&tab=*` |
| `routes/hub/**` | `/hub` (hub binary only) |
| `app/AppShell`, `layout/**`, `index.css` | All routes |

### 2. Browser driver

Follow **ce-test-browser** skill:

- Port: **18081** (`VISUAL_PORT` / `make ui-visual-serve`)
- Prefer host-native browser; fallback `agent-browser`
- Do not add Puppeteer/Playwright MCP for agent sessions

### 3. Per-route checklist

For each scoped route in the manifest:

1. Set viewport from manifest (`1440×900` or `390×844`)
2. Navigate to URL from `make ui-visual-routes`
3. Screenshot full page or main content
4. Run checklist items from manifest
5. Compare to baseline PNG if present (Stitch reference — not pixel-perfect gate)

### 4. Mandatory interaction tests

**Services** (`/services`, 1440×900):

1. Click **List** toggle
2. Select **last** service in list
3. **PASS:** heading “Service details” (or TR equivalent) is in viewport without page scroll
4. **FAIL:** user must scroll page up to see detail

**Processes** (`/processes`, 1440×900):

1. Click **last** table row
2. **PASS:** “Process details” heading in viewport

**Containers agent dashboard:**

- **Do not** open `http://127.0.0.1:<mapped-port>/` from container ports
- Use `/container-metrics?id=abc123def456` on host **18081**

### 5. Mask dynamic fields

Exclude from visual diff judgment:

- `data-testid="live-indicator"` (timestamp)
- Pulsing live dot animation
- Exact CPU % if not DEMO_MODE

### 6. Report format

```markdown
## Visual review

**Verdict:** PASS | FAIL | NEEDS REVIEW

| Route | Viewport | Checklist | Result |
|-------|----------|-----------|--------|
| /services | 1440×900 | bottom-row-detail | PASS |

**Evidence:** (screenshot paths or descriptions)

**Blockers:** (only must-fix)
```

## CI handoff

For automated regression, run `make ui-e2e` (Playwright). Agent review does not replace CI on merge.

## Council

- V20: UI strings from i18n only
- V16: UI reads snapshot store, not logs
