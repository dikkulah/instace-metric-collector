# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Removed

- Qodana static analysis (`qodana.yaml`, `.github/workflows/qodana_code_quality.yml`)

### Added

- Phase 4 actuator: gated health/liveness/readiness probes (ADR-007)
- Phase 7 hub: ingest API, agent push, webhook alerts, `/hub.html` (ADR-006)
- Phase 5 deployment: `Dockerfile`, `docker-compose.yml`, `docs/DEPLOYMENT.md`, `make docker-{build,up,down,smoke}`
- Phase 3 dashboard: `MetricsSnapshotStore`, REST/SSE API, static UI with EN/TR i18n
- Market scenarios doc: 9 customer segments (`docs/MARKET_SCENARIOS.md`)
- MVP-3 feature candidates and MSP pricing model in `PRODUCT_SPEC.md`
- Phase 8–9 backlog and GraalVM research in `PHASE_GATES.md`
- Dashboard i18n plan: EN + TR, ADR-004, veto V20, `tool/i18n_lint.sh`
- Phase 7 planning: hub + alerts (MVP-2)
- Council vetoes V16–V19 for UI layer
- Phase renumbering: UI=3, Actuator=4, Docker=5, disk/network=6
