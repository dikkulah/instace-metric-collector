# ADR-009: Java runtime kaldırılması

## Durum

Kabul edildi — 2026-07-24

## Bağlam

Java/Spring Boot MVP (Phases 1–7) tamamlandı. Go rewrite (ADR-008) ile agent, hub, collector'lar, REST/SSE API ve React SPA üretim kullanımına hazır hale getirildi.

## Karar

`src/`, Maven (`pom.xml`, `mvnw`) ve Java CI job'u repodan kaldırılır. Tek runtime `go/` olur.

## Gerekçe

- Çift bakım maliyeti (Java + Go) gereksiz
- Go binary daha küçük, daha hızlı başlar
- React SPA zaten `go/internal/webui` altında gömülü
- Docker image Go multi-stage build'e geçer

## Korunan sözleşmeler

- `MetricsPayload` JSON şeması (`go/internal/payload/types.go`)
- REST endpoint'leri: `/api/metrics/*`, `/api/meta`, `/api/containers/*`, `/api/v1/*`
- Ortam değişkenleri: `SERVER_PORT`, `METRICS_COLLECTION_INTERVAL`, `DOCKER_ENABLED`, vb.

## Bilinen eksikler (post-cutover backlog)

| Özellik | Java'da | Go'da |
|---------|---------|-------|
| JSON log dosyası çıktısı | Var | G1 backlog |
| Hub push client | Var | G5 backlog |
| Webhook alerts | Var | G7 backlog |
| Windows collector | Var | Stub |
| Golden payload testleri | Var | G5 backlog |
| Actuator | Var | Yok (phase-gated V13) |

Bu eksikler cutover'ı engellemez; dokümante edilir ve G5+ fazlarında tamamlanır.

## Sonuçlar

- `make run` → Go agent
- CI → `go test ./...` + UI build
- `Dockerfile` → Go multi-stage
- Eski Java referans dokümanları güncellenir

## Alternatifler

1. **Java'yı tut, Go'yu paralel çalıştır** — reddedildi (bakım yükü)
2. **Sadece API'yi Go'ya taşı, UI'ı Java static'te bırak** — reddedildi (React SPA zaten hazır)
