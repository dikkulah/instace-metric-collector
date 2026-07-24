# instance-metric-collector

Host metriklerini toplayan, zamanlanmış JSON log üreten Spring Boot arka plan ajanı.

## Ne yapar?

- CPU ve bellek kullanımını izler (JMX)
- Çalışan süreçleri ve servisleri listeler (OS-spesifik shell komutları)
- İsteğe bağlı olarak Docker container metriklerini toplar (cache + ayrı schedule)
- Sonuçları `MetricsPayload` JSON olarak log dosyasına yazar

## Hızlı başlangıç

```bash
make onboard    # ilk kurulum (deps + hooks)
make run        # uygulamayı başlat
make ci-fast    # günlük doğrulama (unit test)
make ci-smoke   # milestone öncesi (test + kısa smoke run)
```

## Mimari özeti

```
InstanceMetricsSender (@Scheduled)
    ├── MetricsCollector (@Primary, OS-spesifik)
    │   ├── LinuxMetricsCollector
    │   ├── MacMetricsCollector
    │   └── WindowsMetricsCollector
    └── DockerContainerCollector (opsiyonel, cache)
            → MetricsPayload → JSON log
```

Detay: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Yol haritası

| Phase | Özellik | Durum |
|-------|---------|-------|
| 1 | JSON log + collector'lar | Tamamlandı |
| 2 | HTTP push → hub ingest | Tamamlandı (Phase 7) — [`docs/HUB.md`](docs/HUB.md) |
| **3** | **Canlı metrik dashboard UI (EN + TR)** | **Tamamlandı** |
| 4 | Actuator health | Tamamlandı — [`docs/ACTUATOR.md`](docs/ACTUATOR.md) |
| 5 | Dockerfile + docker compose | Tamamlandı — [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| 6 | Disk/network metrikleri | Tamamlandı — [ADR-005](docs/DECISIONS/ADR-005-disk-network-payload.md) |
| 7 | Hub + alert (MVP-2) | Tamamlandı — [`docs/HUB.md`](docs/HUB.md) |
| **10** | **Historic mod + kalıcı geçmiş** | **Planlandı** — [`HISTORY_ALERTS_DIAGNOSTICS_PLAN.md`](docs/HISTORY_ALERTS_DIAGNOSTICS_PLAN.md) |
| **11** | **Alert platformu** | Planlandı |
| **12** | **Diagnostics / tanı** | Planlandı |
| 8–9 | Multi-tenant, watchdog | MVP-3 backlog |

Pazar senaryoları ve müşteri segmentleri: [`docs/MARKET_SCENARIOS.md`](docs/MARKET_SCENARIOS.md)

Phase 3 sonrası `make run` → `http://localhost:8080` üzerinden metrikler canlı izlenebilir. Ürün vizyonu: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)

## Geliştirme

| Komut | Açıklama |
|-------|----------|
| `make help` | Tüm hedefler |
| `make test` | Unit testler |
| `make setup-hooks` | Pre-push hook (mvn test) |
| `make doctor` | Java 21 + mvnw kontrolü |

Katkı: [`CONTRIBUTING.md`](CONTRIBUTING.md)  
Agent kuralları: [`AGENTS.md`](AGENTS.md)

## Tech stack

- Java 21, Spring Boot 3.3.4
- Maven wrapper (`./mvnw`)
- docker-java (opsiyonel container izleme)

## Docker

```bash
make docker-up      # build + start → http://localhost:8080
make docker-down
make docker-smoke   # automated compose smoke
```

macOS Docker Desktop:

```bash
export DOCKER_SOCKET="$HOME/.docker/run/docker.sock"
make docker-up
```

Detay: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Hub (çoklu agent)

```bash
make run-hub   # hub + yerel agent otomatik kayıt
open http://localhost:8080/hub.html

# Uzak agent push
metrics.push.enabled=true metrics.push.ingest-url=http://hub:8080/api/v1/ingest make run
```

Detay: [`docs/HUB.md`](docs/HUB.md)

## Actuator (ops probe)

```bash
metrics.actuator.enabled=true make run
curl http://localhost:8080/actuator/health/liveness
```

Varsayılan kapalı. Detay: [`docs/ACTUATOR.md`](docs/ACTUATOR.md)

## Konfigürasyon

`src/main/resources/application.properties`:

```properties
metrics.collection.interval=60000
docker.enabled=true
docker.collection.interval=15000
logging.file.name=metrics-collector.log
```

## Lisans

TBD
