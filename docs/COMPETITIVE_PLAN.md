# Outpost — Rakip Analizi ve Uygulama Planı

**Durum:** Onaylı plan (Jul 2026)  
**Ürün adı (aday):** Outpost (`outpost-agent` / `outpost-hub`)  
**Repo:** `instance-metric-collector` (Go runtime, ADR-009)

---

## Executive summary

Outpost, **Beszel'in sahip olmadığı üç yeteneği** (süreç + servis drill-down, kural tabanlı diagnostics, EN+TR UI) tek pakette sunan, 1–20 sunuculuk self-hosted monitoring ürünüdür.

**Beszel'e karşı 3 fark:**

1. Süreç + servis izleme (PID/CPU/RAM, systemd/launchd durumu)
2. Kural tabanlı diagnostics (connectivity fail dahil) — **AI tabanlı tanı sonraya ertelendi**
3. Tam `MetricsPayload` history (Tier 0) + TR yerelleştirme

**3 kritik gap (öncelik sırası):**

1. Historic UI (backend hazır, ekran yok)
2. Alert yaşam döngüsü (OPEN/ACK/RESOLVED, silence, kanallar)
3. Release/kurulum cilası (cross-compile, install script)

---

## Konumlandırma

| Boyut | Tanım |
|-------|--------|
| Hedef | Homelab, küçük ekip, TR MSP — 1–20 sunucu |
| Mimari | Agent (push) → Hub (SQLite) → React SPA |
| Rakip | Beszel (en yakın), Netdata, Glances, Uptime Kuma |
| Yapılmayacak | Prometheus stack, ML anomaly, Zabbix parity, 800+ collector |

---

## Mevcut durum (Jul 2026)

| Alan | Durum |
|------|--------|
| G0–G1, G4, G5 | ✅ |
| G7 Tier 0 history | ✅ (`internal/history/`) |
| Alert engine + webhook | ✅ |
| Diagnostics (kural tabanlı) | ⚠️ başladı (`CONNECTIVITY_FAIL` vb.) |
| Connectivity probes | ✅ ADR-010 |
| Dockerfile + compose | ✅ (G6 kısmi) |
| G6 release CI | 🔄 T1 |
| G7 rollup | ❌ |
| Phase 10 Historic UI | ❌ |
| Phase 11 Alert platform | ⚠️ kısmi |
| Phase 12 Diagnostics tam set | ❌ |
| Windows collector | ❌ stub (TD-010) |

---

## Diagnostics stratejisi

| Katman | Ne zaman | Açıklama |
|--------|----------|----------|
| **P12 — Kural tabanlı** | Önce | CPU_SPIKE, MEMORY_PRESSURE, DISK_FILLING, CONTAINER_FLAP; deterministik, test edilebilir |
| **AI tabanlı tanı** | Sonra (MVP-4+) | Historic veri + alert geçmişi birikince; opsiyonel harici LLM veya lokal model; phase gate + kullanıcı onayı gerekir |

AI diagnostics eklemeden önce P12 kural motoru ve tam payload history şart — aksi halde model gürültülü/eksik veriyle çalışır.

---

## Feature gap özeti

Detaylı 27 satırlık matris ve faz planı bu dokümanın kaynağı olan Jul 2026 analiz oturumunda üretildi. Öncelikli satırlar:

| Özellik | Durum | Faz |
|---------|--------|-----|
| Historic charts | ⚠️ | P10 |
| Rollup / retention | ❌ | G7b — [ADR-012](DECISIONS/ADR-012-history-rollup.md) |
| Release binaries + GHCR | 🔄 | G6 T1 |
| Alert lifecycle | ⚠️ | P11 — [ADR-011](DECISIONS/ADR-011-alert-lifecycle.md) |
| Slack/Discord/email | ❌ | P11 |
| Install script | ❌ | G6 T2 |
| Ingest token | ❌ | G6 T3 |
| Windows collector | ❌ | G2-W |
| Prometheus exporter | ❌ | MVP-3 (V13 gate) |
| Multi-tenant / OAuth | ❌ | MVP-3 |

---

## Faz sırası

```
G6 (release) → G7b (rollup) → P10 (historic UI) → P11 (alerts) → P12 (diagnostics)
  → G2-W (Windows) → MVP-3 → [ileride] AI diagnostics
```

| Faz | Efor (gün) | Exit |
|-----|------------|------|
| G6 | 3–4 | Tag → binary + image; install script |
| G7b | 4–5 | hourly/daily rollup; `resolution` API |
| P10 | 5–6 | Live \| History toggle; zaman seçici |
| P11 | 6–8 | ACK/silence; 3 bildirim kanalı |
| P12 | 4–5 | 4 insight tipi + runbook UI |
| G2-W | 6–8 | Windows golden parity |

---

## Beszel head-to-head (özet kararlar)

| Beszel özelliği | Karar |
|-----------------|--------|
| Historic charts | **Evet** — P10 |
| Bildirim kanalları (3 adet) | **Evet** — P11 |
| OAuth/multi-user | Sonra — MVP-3 |
| GPU / S.M.A.R.T. | Sonra / hayır (kurulum karmaşıklığı) |
| S3 backup | MVP-3; önce script |
| PocketBase | **Hayır** — kendi SQLite + tam payload |

---

## Farklılaşma

- **Pazarlama:** *"Beszel grafiği gösterir; Outpost suçluyu gösterir"* (süreç + diagnostics)
- **TR MSP:** EN+TR + self-hosted + KVKK konumlandırması
- **Tek agent:** host metrik + connectivity probe (Kuma + Beszel birleşimi)

**Kopyalanmayacak:** Netdata granülaritesi, ML anomaly, Zabbix SLA/dependency, APM.

---

## Sprint backlog (ilk 2 hafta)

| # | Ticket | Faz |
|---|--------|-----|
| T1 | Release CI: cross-compile + GHCR | G6 | ✅ |
| T2 | `tool/install_agent.sh` | G6 | ✅ |
| T3 | Ingest token doğrulaması | G6 | ✅ (zaten vardı + test genişletildi) |
| T4 | History hourly rollup | G7b | ✅ |
| T5 | History API `resolution` param | G7b | ✅ |
| T6 | UI Live \| History toggle | P10 | Sırada |
| T7 | Alert ACK endpoint + UI | P11 |
| T8 | Doküman senkron (PRODUCT_SPEC, G6 tablosu) | — |

---

## Go/No-Go

**GO** — Outpost adı ve mevcut yön ile devam.

1. Pazar Beszel ile doğrulandı; süreç/servis/diagnostics farkı savunulabilir.
2. Gap'ler kapatılabilir (~4–6 hafta odaklı iş).
3. İsim riski yönetilebilir (`outpost-agent`/`outpost-hub` temiz; repo `outpost-monitor` önerilir).

---

## İlgili ADR'ler

- [ADR-010](DECISIONS/ADR-010-connectivity-probes.md) — connectivity probes
- [ADR-011](DECISIONS/ADR-011-alert-lifecycle.md) — alert lifecycle ve bildirim kanalları
- [ADR-012](DECISIONS/ADR-012-history-rollup.md) — history rollup katmanları

Plan detayı: [`HISTORY_ALERTS_DIAGNOSTICS_PLAN.md`](HISTORY_ALERTS_DIAGNOSTICS_PLAN.md) · Yol haritası: [`GO_REWRITE_PLAN.md`](GO_REWRITE_PLAN.md)
