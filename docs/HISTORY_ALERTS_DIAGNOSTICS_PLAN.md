# Geçmiş analiz, alarmlar ve tanı — ürün planı

**Durum:** Planlama (implementasyon yok)  
**Önkoşul:** Phase 7 hub + Phase 3/6 dashboard tamamlandı  
**Hedef MVP:** MVP-2.5 → MVP-3 geçiş katmanı

---

## Özet vizyon

Bugün:

- Agent/hub **son snapshot + kısa ring buffer** (bellekte, restart’ta kaybolur)
- Alert: **eşik + webhook**, geçmişi yok
- UI: **canlı mod** — trend çizgileri sınırlı (`history.size=60`)

Hedef:

| Mod | Kullanıcı sorusu |
|-----|------------------|
| **Canlı** (mevcut) | “Şu an ne oluyor?” |
| **Geçmiş (Historic)** | “Dün gece CPU neden yükseldi?” |
| **Alarmlar** | “Ne zaman, hangi agent, hangi kural tetiklendi?” |
| **Tanı (Diagnostics)** | “Muhtemel kök neden ve önerilen adımlar neler?” |

```mermaid
flowchart LR
    subgraph today [Bugün]
        LIVE[Canlı dashboard]
        WH[Webhook alert]
        MEM[In-memory ring buffer]
    end

    subgraph target [Hedef]
        HIST[Historic UI]
        ALERT_UI[Alert merkezi]
        DIAG[Diagnostics panel]
        STORE[(Kalıcı store)]
    end

    LIVE --> HIST
    MEM --> STORE
    WH --> ALERT_UI
    STORE --> DIAG
    ALERT_UI --> DIAG
```

---

## Mevcut durum (baseline)

| Bileşen | Kapasite | Sınır |
|---------|----------|-------|
| `MetricsSnapshotStore` | Son N snapshot (varsayılan 60) | JVM restart = veri kaybı |
| `HubAgentRegistry` | Per-agent ring buffer | Hub tek instance, RAM |
| `AlertService` | CPU/RAM/container → webhook | Kural seti sabit, geçmiş yok |
| Dashboard `/` | CPU/RAM bar, tablolar | Zaman aralığı seçimi yok |
| Hub `/hub.html` | Agent listesi + özet | Per-agent kısa geçmiş API var, UI’da grafik yok |

**Bilinen teknik borç (planı besler):** macOS `networkUsage` duplicate arayüz satırları; disk %94 gibi eşikler alert’e düşmeli.

---

## Veri zenginliği stratejisi (kullanıcı kararı, Jul 2026)

**İlke:** Historic store’a yazılan veri **mümkün olduğunca tam** olmalı; ileride diagnostics, alert korelasyonu, servis–süreç analizi ve UI drill-down için **veri eksikliği yaşanmamalı**. Prod build’de disk/bant genişliği için **kısma retention ve rollup ile** yapılır — ingest aşamasında alan atılmaz.

### Katmanlar

```mermaid
flowchart TB
  ingest[Ingest full MetricsPayload]
  raw[(Tier0 raw_samples)]
  rollup1[(Tier1 hourly rollup)]
  rollup2[(Tier2 daily summary)]
  prod[Prod profile trims retention not schema]

  ingest --> raw
  raw -->|"7-30 gün"| rollup1
  rollup1 -->|"90+ gün"| rollup2
  prod -.->|"metrics.history.profile"| raw
```

| Katman | Ne saklanır | Varsayılan süre (dev) | Prod’da |
|--------|-------------|------------------------|---------|
| **Tier 0 — Raw** | Tam `MetricsPayload` JSON + metadata | 30 gün | `standard`: 7 gün; `minimal`: kapalı |
| **Tier 1 — Hourly** | Host özet + top-N süreç/servis/container | 90 gün | 30 gün |
| **Tier 2 — Daily** | CPU/RAM/disk/network özet, sayaçlar | 1 yıl | 90 gün |

### Ingest’te zorunlu alanlar (her sample)

| Alan | Açıklama |
|------|----------|
| `agent_id` | Agent kimliği |
| `collected_at` | Agent tarafı toplama zamanı (RFC3339) |
| `ingested_at` | Hub alım zamanı |
| `schema_version` | Payload sürümü (ör. `1`) — ileri uyumluluk |
| `payload_json` | **Tam** `MetricsPayload` (aşağıdaki tüm listeler dahil) |
| `collection_duration_ms` | Toplama süresi (opsiyonel ama önerilir) |
| `host_os` | `linux` / `darwin` / `windows` |
| `host_arch` | `amd64` / `arm64` |

### `payload_json` içinde korunacak detay (Tier 0)

`MetricsPayload` tamamı — özet kolonlara indirgeme **ingest’te yapılmaz**:

| Grup | Alanlar |
|------|---------|
| Host | `cpuLoad`, `usedMemory`, `totalMemory`, `availableProcessors`, `systemLoadAverage` |
| Süreçler | `processInfos[]`: `user`, `pid`, `cpuUsage`, `memoryUsage`, `command` (tam komut satırı) |
| Servisler | `serviceInfos[]`: `serviceName`, `status`, `description` |
| Container | `containers[]`: `id`, `name`, `image`, `status`, `health`, `restartCount`, `composeProject`, `composeService`, `ports` |
| Disk | `diskUsage[]`: `mount`, `filesystem`, `totalBytes`, `usedBytes`, `usePercent` |
| Network | `networkUsage[]`: `name`, `bytesReceived`, `bytesSent` |

### Normalized tablolar (sorgu / Phase 11–12 için)

Raw JSON yeterli olsa da, **Phase 10b** ile ingest sonrası async parse:

- `process_samples` — `(agent_id, collected_at, pid, user, cpu, memory, command_hash, command)`  
- `service_samples` — `(agent_id, collected_at, service_name, status, description)`  
- `container_samples` — `(agent_id, collected_at, container_id, …)`  
- `disk_samples`, `network_samples` — zaman serisi grafikleri için

Böylece “dün gece hangi PID CPU yedi?” sorusu JSON parse etmeden cevaplanır; raw JSON yine Tier 0’da kalır (reprocess / yeni özellikler için).

### Prod profile (`metrics.history.profile`)

| Profile | Tier 0 | Tier 1 | Not |
|---------|--------|--------|-----|
| `full` | Tam payload, uzun retention | Tam top-N | Dev / MSP / air-gapped **varsayılan** |
| `standard` | Tam payload, kısa retention | Özet + top 50 süreç | Orta disk |
| `minimal` | Kapalı | Yalnızca host metrikleri | Edge / düşük disk |

**Kural:** Profile yalnızca **retention ve rollup agresifliğini** değiştirir; ingest şeması ve API alanları aynı kalır (V6 — additive).

### Go rewrite (Phase G7) ile hizalama

Historic store Go hub’da (`internal/history/`) implement edilir; Java’da minimal veya yok. G5 hub ingest pipeline’ı **baştan** `payload_json` tam yazacak şekilde tasarlanır — sonradan kolon eklemek yerine.

---

## Phase 10 — Kalıcı geçmiş + Historic mod (önerilen sıra: 1)

**Ürün kodu:** M20  
**Segment:** Homelab power user, MSP, air-gapped edge

### Kapsam

**Backend (hub-first):**

- SQLite — hub’da kalıcı store (H2 yalnızca test)
- Ingest sonrası **async** yazım: önce tam `payload_json` (Tier 0), sonra normalized tablolar (Phase 10b)
- Retention: `metrics.history.retention.days`, `metrics.history.profile` (`full` | `standard` | `minimal`)
- Rollup job: hourly/daily — veri **silinmeden önce** özet üretilir
- API:
  - `GET /api/v1/agents/{id}/history?from=&to=&resolution=`
  - `GET /api/v1/agents/{id}/series?metric=cpuLoad&from=&to=` (downsampled)

**Agent (opsiyonel, Phase 10b):**

- Yerel SQLite — `docker.enabled=false` + hub yok senaryosu
- Sync to hub when online (MVP-3+)

**UI — Historic mod:**

- Toggle: **Live | History** (header)
- Zaman seçici: Son 1s / 6s / 24s / 7g / özel aralık
- Grafikler: CPU, RAM, disk %, container sayısı (CSS bar veya hafif chart lib CDN)
- Hub: per-agent historic drill-down
- i18n: tüm yeni string’ler `en.json` / `tr.json` (V20)

### Exit criteria (gate taslağı)

- [ ] ADR-009: storage schema + retention + **full-payload-first** ilkesi
- [ ] Hub persist ingest — Tier 0 tam `MetricsPayload` JSON
- [ ] Retention + rollup (Tier 1/2) + `metrics.history.profile`
- [ ] History API + downsampling (özet seriler; drill-down raw’dan)
- [ ] Dashboard + hub historic UI
- [ ] `make ci-fast` + migration smoke + disk boyutu doc
- [ ] (10b) Normalized `process_samples` / `service_samples` / `container_samples`

### Council notları

- Payload şeması değişmez (V6); store ayrı tablo
- Log parse yok (V16); historic veri ingest/store’dan

---

## Phase 11 — Alert platformu (önerilen sıra: 2)

**Ürün kodu:** M21  
**Mevcut Phase 7 webhook’u evrimleştirir**

### Kapsam

**Kural motoru:**

```yaml
# örnek — config veya hub UI
rules:
  - id: cpu-sustained-high
    metric: cpuLoad
    condition: avg > 0.85 for 5m
    severity: warning
  - id: disk-critical
    metric: diskUsage.usePercent
    filter: mount == "/"
    condition: max > 90
    severity: critical
  - id: container-exited
    source: containers
    condition: status contains "exit"
```

**Alert yaşam döngüsü:**

- Durumlar: `OPEN` → `ACK` → `RESOLVED`
- Alert geçmişi DB’de (`alert_events`)
- Cooldown + dedup (aynı agent+kural)
- Kanallar: webhook (mevcut), email (MVP-3), Slack (MVP-3)

**UI — Alert merkezi:**

- `/alerts.html` veya hub içi sekme
- Filtre: agent, severity, zaman, durum
- “Sessize al” (silence) 1s/24s
- EN + TR

### Exit criteria

- [ ] ADR-009: alert model + severity
- [ ] Rule config (properties veya hub REST)
- [ ] Alert store + REST API
- [ ] Webhook payload v2 (backward compatible alanlar)
- [ ] Alert UI + i18n
- [ ] Unit test: rule evaluation, dedup

### Mevcut `AlertService` ile ilişki

Phase 7 `AlertService` → Phase 11’de `AlertEngine` + `NotificationDispatcher` olarak refactor; sabit eşikler varsayılan kural seti olur.

---

## Phase 12 — Tanı ve içgörü (Diagnostics) (önerilen sıra: 3)

**Ürün kodu:** M22  
**Segment:** MSP L1 destek, ajans, solo admin

### Kapsam

**Tanı motoru (kural tabanlı MVP, ML değil):**

> **Not (Jul 2026):** AI tabanlı tanı (LLM özet, kök neden önerisi) MVP-4+ sonrasına ertelendi. Önce P12 kural motoru + tam history (G7b/P10) tamamlanır. Bkz. [`COMPETITIVE_PLAN.md`](COMPETITIVE_PLAN.md).

| Insight tipi | Tetikleyici | Çıktı |
|--------------|-------------|-------|
| `CPU_SPIKE` | 5 dk içinde 2x artış | Top process listesi o anki snapshot’tan |
| `MEMORY_PRESSURE` | RAM > eşik 10 dk | Öneri: swap, top memory processes |
| `DISK_FILLING` | Disk usePercent trend ↑ | “X günde dolabilir” (lineer extrapolation) |
| `CONTAINER_FLAP` | restartCount artışı | Container adı + son status |
| `AGENT_STALE` | Hub’da lastSeen > 2× interval | Agent offline uyarısı |
| `DOCKER_UNAVAILABLE` | Collector docker hatası | “Docker socket kontrol edin” |

**Diagnostics API:**

- `GET /api/v1/agents/{id}/diagnostics` — açık insight listesi
- `GET /api/v1/agents/{id}/diagnostics/{insightId}` — detay + önerilen adımlar (markdown)

**UI:**

- Agent detayında **Diagnostics** paneli
- Severity badge (info / warning / critical)
- “Son 24 saatte” özeti
- Export: JSON veya kısa metin (destek ticket’ı için)

**Alarm entegrasyonu:**

- Critical insight → otomatik alert kuralı (opsiyonel)
- Alert ACK sonrası ilgili diagnostic “acknowledged”

### Exit criteria

- [ ] ADR-010: diagnostics insight schema
- [ ] `DiagnosticEngine` scheduled + on-ingest
- [ ] REST + UI panel
- [ ] EN/TR runbook string’leri locale dosyasında (V20)
- [ ] Test: fixture snapshot → beklenen insight

---

## UI bilgi mimarisi (hedef)

```
┌─ Header: [Live | History]  [Alerts (3)]  [EN ▾] ─────────────┐
├─ Agent dashboard (mevcut)                                    │
├─ History mode: zaman çubuğu + CPU/RAM/disk grafikleri        │
├─ Alerts drawer: açık olaylar, filtre, ack                    │
└─ Diagnostics: insight kartları + “önerilen adımlar”          │
```

Hub (`/hub.html`) aynı modları agent seçimine göre gösterir.

---

## Veri modeli taslağı (hub SQLite)

```sql
-- Tier 0: tam payload (historic modun kaynağı — ingest'te kısaltma yok)
CREATE TABLE raw_samples (
  agent_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  host_os TEXT,
  host_arch TEXT,
  collection_duration_ms INTEGER,
  cpu_load REAL,
  used_memory INTEGER,
  total_memory INTEGER,
  available_processors INTEGER,
  system_load_average REAL,
  payload_json TEXT NOT NULL,   -- tam MetricsPayload
  PRIMARY KEY (agent_id, collected_at)
);

-- Tier 1: saatlik rollup (Tier 0'dan job ile; ham veri silinmeden önce)
CREATE TABLE hourly_rollups (
  agent_id TEXT NOT NULL,
  bucket_start TEXT NOT NULL,
  cpu_load_avg REAL,
  cpu_load_max REAL,
  mem_used_avg INTEGER,
  process_count INTEGER,
  service_count INTEGER,
  container_count INTEGER,
  top_processes_json TEXT,      -- top 50 by CPU
  top_services_json TEXT,
  payload_summary_json TEXT,    -- disk/network özet
  PRIMARY KEY (agent_id, bucket_start)
);

-- Phase 10b: normalized drill-down (async parse from payload_json)
CREATE TABLE process_samples (
  agent_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  pid INTEGER NOT NULL,
  user TEXT,
  cpu_usage REAL,
  memory_usage REAL,
  command TEXT,
  command_hash TEXT,
  PRIMARY KEY (agent_id, collected_at, pid)
);

CREATE TABLE service_samples (
  agent_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  service_name TEXT NOT NULL,
  status TEXT,
  description TEXT,
  PRIMARY KEY (agent_id, collected_at, service_name)
);

CREATE TABLE container_samples (
  agent_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  container_id TEXT NOT NULL,
  name TEXT,
  image TEXT,
  status TEXT,
  health TEXT,
  restart_count INTEGER,
  compose_project TEXT,
  compose_service TEXT,
  ports_json TEXT,
  PRIMARY KEY (agent_id, collected_at, container_id)
);

CREATE TABLE alert_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,         -- OPEN, ACK, RESOLVED
  fired_at TEXT NOT NULL,
  resolved_at TEXT,
  details_json TEXT NOT NULL    -- tetik anındaki payload snapshot / context
);

CREATE TABLE diagnostic_insights (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  summary_key TEXT NOT NULL,    -- i18n key
  details_json TEXT NOT NULL
);
```

Detay şema Phase 10 gate’inde **ADR-009** ile kesinleşir. Prod’da `metrics.history.profile=minimal` yalnızca retention/Tier kullanımını kısar; tablo şeması değişmez.

---

## Öncelik ve tahmini effort

| Faz | Değer | Effort (1 dev) | Bağımlılık |
|-----|-------|----------------|------------|
| **Phase 10** Historic | Yüksek — “ürün” hissi | 2–3 hafta | — |
| **Phase 11** Alerts | Yüksek — MSP | 2 hafta | Phase 10 (alert history) |
| **Phase 12** Diagnostics | Orta-yüksek — farklılaşma | 2–3 hafta | Phase 10 + 11 |

**Önerilen sıra:** 10 → 11 → 12 (diagnostics, geçmiş veri ve alert olayları olmadan sınırlı kalır).

---

## Bilinçli kapsam dışı (şimdilik)

- ML/anomaly detection
- Log aggregation (Loki/ELK)
- Tam ITSM entegrasyonu (ServiceNow vb.)
- Prometheus remote write
- Multi-region hub replication

Bunlar MVP-3+ veya ayrı ADR.

---

## İlgili dokümanlar

- [`PHASE_GATES.md`](PHASE_GATES.md) — Phase 10–12 backlog
- [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) — M20–M22
- [`UI_PLAN.md`](UI_PLAN.md) — Historic / Alerts / Diagnostics UI
- [`HUB.md`](HUB.md) — mevcut hub API
- M18 (SQLite) bu planda Phase 10 ile birleştirildi

---

## Onay gereksinimi

Her faz için:

1. Kullanıcı onayı + Council gate (yeni veto maddeleri: persist güvenliği, PII in store)
2. ADR (008–010)
3. `make ci-smoke` genişletmesi

**Sonraki adım:** Phase 10 için ADR-009 taslağı (full-payload-first + retention profiles) + kullanıcı onayı.
