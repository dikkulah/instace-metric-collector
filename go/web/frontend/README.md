# React SPA (Go agent/hub UI)

Vite + React + TypeScript + Tailwind. Design tokens from Stitch (Instance Metric Collector design system).

## Dev (hot reload)

Terminal 1 — Go agent API:

```bash
make go-run
```

Terminal 2 — Vite dev server (proxies `/api` to :8080):

```bash
cd go/web/frontend && npm run dev
```

Open http://localhost:5173

Hub dev proxy:

```bash
VITE_API_PROXY=http://127.0.0.1:8081 npm run dev
```

## Production build (embedded in Go binary)

```bash
make ui-build          # npm run build + copy dist → go/internal/webui/dist
make go-build          # includes ui-sync-dist
METRICS_UI_ENABLED=true SERVER_PORT=8080 ./go/bin/agent
```

Open http://localhost:8080

## Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard overview |
| `/processes` | Process list + detail (`?pid=`) |
| `/services` | Service list + detail (`?service=`) |
| `/containers` | Master-detail containers (Stitch v2) |
| `/container-metrics` | Full container agent dashboard (`?id=&tab=`) |
| `/hub` | Hub agent list (hub mode) |

## i18n

Locales: `src/i18n/en.json`, `src/i18n/tr.json`. Coverage check:

```bash
bash tool/check_i18n_coverage.sh
```
