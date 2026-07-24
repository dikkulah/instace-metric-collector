# instance-metric-collector

Host metriklerini toplayan Go ajanı — REST/SSE API ve gömülü React dashboard.

## Ne yapar?

- CPU, bellek, disk ve ağ kullanımını izler (gopsutil)
- Çalışan süreçleri ve servisleri listeler (OS-spesifik: launchctl / systemctl)
- İsteğe bağlı Docker container metrikleri (cache + ayrı schedule)
- Son snapshot'ı REST/SSE ile sunar; hub modunda agent kaydı

## Hızlı başlangıç

```bash
make onboard    # ilk kurulum (deps + hooks)
make run        # agent + UI → http://localhost:8080
make ci-fast    # günlük doğrulama (go test)
make ci-smoke   # milestone öncesi (test + kısa smoke run)
```

## Mimari özeti

```
cmd/agent
    ├── internal/runtime (scheduler)
    ├── internal/collector (OS-spesifik)
    ├── internal/docker (opsiyonel)
    └── internal/web (REST + SSE + gömülü SPA)
```

Detay: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Go plan: [`docs/GO_REWRITE_PLAN.md`](docs/GO_REWRITE_PLAN.md)

## Yol haritası

| Phase | Özellik | Durum |
|-------|---------|-------|
| G0–G4 | Go agent/hub, collector'lar, REST/SSE, React SPA | Tamamlandı |
| G5 | Hub push client, golden payload testleri | Backlog |
| G6 | Docker deploy (Go image) | Tamamlandı |
| G7 | Historic store, alerts | Planlandı — [`HISTORY_ALERTS_DIAGNOSTICS_PLAN.md`](docs/HISTORY_ALERTS_DIAGNOSTICS_PLAN.md) |

Java MVP (Phases 1–7) referans olarak korunur; runtime artık `go/` altında. Kaldırma: [`ADR-009`](docs/DECISIONS/ADR-009-java-removal.md).

## Geliştirme

| Komut | Açıklama |
|-------|----------|
| `make help` | Tüm hedefler |
| `make test` | Go unit testleri |
| `make setup-hooks` | Pre-push hook (go test) |
| `make doctor` | Go + Node + Docker kontrolü |
| `make build` | agent + hub binary (UI dahil) |
| `make run-hub` | Hub modu → `:8081` |

Katkı: [`CONTRIBUTING.md`](CONTRIBUTING.md)  
Agent kuralları: [`AGENTS.md`](AGENTS.md)

## Tech stack

- **Runtime:** Go 1.22+
- **UI:** React 19 + Vite + TypeScript + Tailwind
- **Collectors:** gopsutil, launchctl (macOS), systemctl (Linux)
- **Docker:** moby client (opsiyonel, `DOCKER_ENABLED=false` ile kapalı)

## Hub

Çoklu agent görünümü için hub binary:

```bash
make run-hub   # http://localhost:8081/hub
```

Detay: [`docs/HUB.md`](docs/HUB.md)

## Docker

```bash
make docker-up      # compose ile başlat
make docker-smoke   # build + API probe
```

## Lisans

MIT — bkz. [`LICENSE`](LICENSE) (varsa).
