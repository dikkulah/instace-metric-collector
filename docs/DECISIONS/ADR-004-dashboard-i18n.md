# ADR-004: Dashboard UI internationalization (i18n)

## Status

Proposed — Phase 3 requirement

## Context

Dashboard UI (Phase 3) targets small teams globally and TR MSP segment locally. User-facing labels must not be hardcoded in HTML/JS. Primary markets: English (default) and Turkish.

API/JSON field names (`cpuLoad`, `processInfos`, …) remain English — only **UI chrome** is translated.

## Decision

**Client-side i18n with JSON locale files** — no npm build, no Spring MessageSource for static dashboard.

### Structure

```
src/main/resources/static/
  locales/
    en.json
    tr.json
  js/i18n.js          # load locale, t(key), setLocale()
  index.html          # data-i18n="key" attributes or JS t() calls
```

### Locale file shape

```json
{
  "app.title": "Instance Metric Collector",
  "nav.live": "Live",
  "card.cpu": "CPU",
  "card.memory": "Memory",
  "card.containers": "Containers",
  "table.processes": "Processes",
  "status.healthy": "Healthy",
  "status.exited": "Exited",
  "lang.en": "English",
  "lang.tr": "Türkçe"
}
```

### Resolution order

1. `localStorage` key `metrics.ui.locale` (user override)
2. `metrics.ui.default-locale` from `application.properties` (server default)
3. Browser `navigator.language` (`tr` → `tr`, else `en`)
4. Fallback: `en`

### Language switcher

Header dropdown or toggle — persists to `localStorage`, re-renders labels without full page reload.

### Config

```properties
metrics.ui.default-locale=en
metrics.ui.locales=en,tr
```

### Lint / CI

`tool/i18n_lint.sh` — verifies `en.json` and `tr.json` have identical key sets (Farabi ARB parity pattern).

## Consequences

**Positive:**
- No extra Maven dependencies
- Easy to add `de.json`, `ar.json` later
- TR MSP requirement met in MVP-1

**Negative:**
- Manual key parity (mitigated by `i18n_lint.sh`)
- Dates/numbers need `Intl` API for locale-aware formatting

## Rules (V20)

- No hardcoded user-visible strings in `static/` HTML/JS
- New UI string = key in **all** shipped locale files
- Metric values from API stay locale-neutral numbers; formatting in JS via `Intl`

## References

- `docs/UI_PLAN.md` — i18n section
- V20 in `docs/VETO_REGISTRY.md`
