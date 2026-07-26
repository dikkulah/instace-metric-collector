# Visual testing

Two layers: **agent-assisted review** (Faz 1) and **Playwright CI gate** (Faz 2).

## When to use what

| Layer | Tool | When |
|-------|------|------|
| Agent review | `ui-visual-review` skill + `ce-test-browser` | After UI changes, before PR |
| Design reference | `tool/visual/baselines/` (Stitch PNG) | Manual / agent side-by-side compare |
| CI regression | `npm run test:e2e` (Playwright) | PR / pre-merge |

## Prerequisites

- Node 22+, Go 1.22+
- `make build` (embeds latest React `dist`)
- Optional: Stitch MCP — `./tool/setup_stitch_mcp.sh`

## Faz 1 — Agent visual review

```bash
make ui-visual-serve      # DEMO_MODE agent on :18081
make ui-visual-routes     # List URLs + viewports
```

In Cursor:

1. Invoke skill **ui-visual-review** (or subagent `@visual-reviewer`)
2. Skill runs checklist from [tool/visual/manifests/routes.json](../tool/visual/manifests/routes.json)
3. Compare screenshots to Stitch baselines in [tool/visual/baselines/](../tool/visual/baselines/)

### Critical scroll regression (Services / Processes)

On **1440×900**:

1. Open `/services`, switch to **List**
2. Select the **last** service in the list
3. **Pass:** right detail panel visible without scrolling the page
4. **Fail:** page scrolls; detail header above viewport

Same for `/processes` (last PID row).

### Container agent dashboard

Do **not** open the container’s mapped port (`8081:8080`) for UI review — that serves the **Docker image** UI (often stale).

Use host routes:

- `/container-metrics?id=<containerId>` — full metrics (current React UI)
- `/containers?id=<containerId>` — master-detail

## Faz 2 — Playwright

```bash
make ui-e2e               # headless, starts DEMO_MODE agent automatically
make ui-e2e-update        # refresh snapshots after intentional UI change
```

Config: [go/web/frontend/playwright.config.ts](../go/web/frontend/playwright.config.ts)

- Port **18081** (avoids clash with dev `:8080`)
- `DEMO_MODE=true`, `DOCKER_ENABLED=false` — deterministic demo payload
- Masks: live indicator / timestamps (`data-testid="live-indicator"`)

### Update baselines (maintainers)

```bash
cd go/web/frontend && npm run test:e2e:update
git add e2e/visual/*.png
```

### Stitch design PNGs

```bash
chmod +x tool/visual/download_baselines.sh
./tool/visual/download_baselines.sh
```

Requires `/tmp/stitch_gen_*_v2.log` from Stitch generation runs.

## CI

GitHub Actions job `visual-e2e` runs on PR/push when frontend changes. On failure, download `playwright-report` artifact from the workflow run.

## Related docs

- [STITCH_SCREENS.md](STITCH_SCREENS.md) — screen IDs
- [LOCAL_CI.md](LOCAL_CI.md) — `make ci-fast` / `make ci-smoke`
- [UI_PLAN.md](UI_PLAN.md) — dashboard architecture
