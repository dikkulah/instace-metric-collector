package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/alert"
	"github.com/dikkulah/instance-metric-collector/go/internal/appmode"
	"github.com/dikkulah/instance-metric-collector/go/internal/config"
	"github.com/dikkulah/instance-metric-collector/go/internal/history"
	"github.com/dikkulah/instance-metric-collector/go/internal/hub"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func TestHandleAgentsListOfflineFromCatalog(t *testing.T) {
	dir := t.TempDir()
	hist, err := history.Open(filepath.Join(dir, "agents.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer hist.Close()

	old := time.Now().UTC().Add(-48 * time.Hour).Format(time.RFC3339Nano)
	snap := payload.Snapshot{
		CollectedAt: old,
		Payload:     payload.MetricsPayload{CPULoad: 33},
	}
	if err := hist.UpsertAgent("offline-1", "gone-host", snap); err != nil {
		t.Fatal(err)
	}

	reg := hub.NewRegistry()
	alertCfg := alert.NewConfigStore(alert.ConfigSnapshot{
		CPUPercent: 90, MemoryPercent: 90, DiskPercent: 90,
		CooldownMinutes: 10, StaleMultiplier: 2,
	})
	cfg := config.Config{
		MetricsCollectionPeriod: 60 * time.Second,
		HubOfflineAfter:         24 * time.Hour,
	}
	deps := testDeps(appmode.Hub, cfg, reg, nil, alertCfg)
	deps.History = hist
	srv := NewServer(deps)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/agents", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
	}

	var agents []hub.AgentSummary
	if err := json.Unmarshal(rec.Body.Bytes(), &agents); err != nil {
		t.Fatal(err)
	}
	if len(agents) != 1 {
		t.Fatalf("agents = %+v", agents)
	}
	if agents[0].Status != hub.AgentStatusOffline {
		t.Fatalf("status = %q want offline", agents[0].Status)
	}
	if agents[0].FirstSeen == "" {
		t.Fatal("expected firstSeen")
	}
}

func TestHandleAgentCurrentHistoryFallback(t *testing.T) {
	dir := t.TempDir()
	hist, err := history.Open(filepath.Join(dir, "current.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer hist.Close()

	snap := payload.Snapshot{
		CollectedAt: time.Now().UTC().Add(-48 * time.Hour).Format(time.RFC3339Nano),
		Payload:     payload.MetricsPayload{CPULoad: 77},
	}
	if err := hist.WriteSample("hist-only", snap); err != nil {
		t.Fatal(err)
	}
	if err := hist.UpsertAgent("hist-only", "hist-host", snap); err != nil {
		t.Fatal(err)
	}

	reg := hub.NewRegistry()
	alertCfg := alert.NewConfigStore(alert.ConfigSnapshot{
		CPUPercent: 90, MemoryPercent: 90, DiskPercent: 90,
		CooldownMinutes: 10, StaleMultiplier: 2,
	})
	cfg := config.Config{
		MetricsCollectionPeriod: 60 * time.Second,
		HubOfflineAfter:         24 * time.Hour,
	}
	deps := testDeps(appmode.Hub, cfg, reg, nil, alertCfg)
	deps.History = hist
	srv := NewServer(deps)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/agents/hist-only/current", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("X-Agent-Status"); got != hub.AgentStatusOffline {
		t.Fatalf("X-Agent-Status = %q", got)
	}
	var body payload.Snapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Payload.CPULoad != 77 {
		t.Fatalf("cpu = %v", body.Payload.CPULoad)
	}
}
