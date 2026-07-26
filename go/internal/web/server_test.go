package web

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/alert"
	"github.com/dikkulah/instance-metric-collector/go/internal/appmode"
	"github.com/dikkulah/instance-metric-collector/go/internal/config"
	"github.com/dikkulah/instance-metric-collector/go/internal/docker"
	"github.com/dikkulah/instance-metric-collector/go/internal/history"
	"github.com/dikkulah/instance-metric-collector/go/internal/hub"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
	"github.com/dikkulah/instance-metric-collector/go/internal/store"
)

func testDeps(mode appmode.Mode, cfg config.Config, registry *hub.Registry, engine *alert.Engine, alertCfg *alert.ConfigStore) Deps {
	return Deps{
		Mode:         mode,
		Config:       cfg,
		MetricsStore: store.NewSnapshotStore(10),
		Registry:     registry,
		Containers:   docker.NoopSource{},
		AlertEngine:  engine,
		AlertConfig:  alertCfg,
	}
}

func TestHandleMetaAgent(t *testing.T) {
	srv := NewServer(testDeps(appmode.Agent, config.Config{}, nil, nil, nil))
	req := httptest.NewRequest(http.MethodGet, "/api/meta", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["mode"] != "agent" {
		t.Fatalf("mode = %q", body["mode"])
	}
}

func TestHandleMetaHub(t *testing.T) {
	srv := NewServer(testDeps(appmode.Hub, config.Config{}, nil, nil, nil))
	req := httptest.NewRequest(http.MethodGet, "/api/meta", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	var body map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body["mode"] != "hub" {
		t.Fatalf("mode = %q", body["mode"])
	}
}

func TestHandleIngestAuth(t *testing.T) {
	reg := hub.NewRegistry()
	cfg := config.Config{HubIngestToken: "secret"}
	srv := NewServer(testDeps(appmode.Hub, cfg, reg, nil, nil))

	body, _ := json.Marshal(ingestBody{
		AgentID:  "a1",
		Hostname: "host",
		Snapshot: payload.Snapshot{CollectedAt: "t", Payload: payload.MetricsPayload{CPULoad: 10}},
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/ingest", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/ingest", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer secret")
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want 202", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/ingest", bytes.NewReader(body))
	req.Header.Set("X-Ingest-Token", "secret")
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("x-ingest-token status = %d, want 202", rec.Code)
	}
}

func TestHandleIngestTriggersAlert(t *testing.T) {
	reg := hub.NewRegistry()
	rec := &recordingNotifier{}
	alertCfg := alert.NewConfigStore(alert.ConfigSnapshot{
		CPUPercent: 50, MemoryPercent: 90, DiskPercent: 90,
		CooldownMinutes: 1, StaleMultiplier: 2,
	})
	engine := alert.NewEngine(alert.DefaultRules(alertCfg), rec, alertCfg, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go engine.Run(ctx)

	srv := NewServer(testDeps(appmode.Hub, config.Config{}, reg, engine, alertCfg))

	body, _ := json.Marshal(ingestBody{
		AgentID:  "a1",
		Hostname: "host",
		Snapshot: payload.Snapshot{
			CollectedAt: "t",
			Payload:     payload.MetricsPayload{CPULoad: 99},
		},
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ingest", bytes.NewReader(body))
	recorder := httptest.NewRecorder()
	srv.Handler().ServeHTTP(recorder, req)
	if recorder.Code != http.StatusAccepted {
		t.Fatalf("status = %d", recorder.Code)
	}
	// allow async worker
	time.Sleep(50 * time.Millisecond)
	if len(rec.events) != 1 || rec.events[0].AlertType != alert.AlertTypeCPUHigh {
		t.Fatalf("alerts = %+v", rec.events)
	}
}

func TestHandleHubAlertConfig(t *testing.T) {
	alertCfg := alert.NewConfigStore(alert.ConfigSnapshot{
		CPUPercent: 90, MemoryPercent: 90, DiskPercent: 90,
		CooldownMinutes: 10, StaleMultiplier: 2,
	})
	srv := NewServer(testDeps(appmode.Hub, config.Config{}, nil, nil, alertCfg))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/hub/alert-config", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("get status = %d", rec.Code)
	}
	var got alert.ConfigSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got.CPUPercent != 90 {
		t.Fatalf("cpu = %v", got.CPUPercent)
	}

	body, _ := json.Marshal(alert.ConfigSnapshot{
		CPUPercent: 70, MemoryPercent: 80, DiskPercent: 85,
		CooldownMinutes: 5, StaleMultiplier: 3,
		CPUSpikeMinPercent: 40, MemoryPressurePercent: 80,
		DiskFillingPercent: 80, ContainerRestartCount: 5,
	})
	req = httptest.NewRequest(http.MethodPut, "/api/v1/hub/alert-config", bytes.NewReader(body))
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("put status = %d", rec.Code)
	}
	if alertCfg.Get().CPUPercent != 70 {
		t.Fatalf("updated cpu = %v", alertCfg.Get().CPUPercent)
	}
}

func TestHandleAlertAck(t *testing.T) {
	dir := t.TempDir()
	hist, err := history.Open(dir+"/test.db", "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer hist.Close()

	ev := alert.Event{
		AgentID:   "a1",
		AlertType: alert.AlertTypeCPUHigh,
		Severity:  alert.SeverityWarning,
	}
	if err := hist.SaveAlertEvent(ev, history.AlertStatusOpen); err != nil {
		t.Fatal(err)
	}
	alerts, err := hist.ListAlerts("", "", "", 10)
	if err != nil || len(alerts) != 1 {
		t.Fatalf("alerts = %+v err=%v", alerts, err)
	}
	alertID := alerts[0].ID

	deps := testDeps(appmode.Hub, config.Config{}, nil, nil, nil)
	deps.History = hist
	srv := NewServer(deps)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/alerts/"+alertID+"/ack", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("ack status = %d body=%s", rec.Code, rec.Body.String())
	}
	var updated history.AlertRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &updated); err != nil {
		t.Fatal(err)
	}
	if updated.Status != history.AlertStatusAck {
		t.Fatalf("status = %q", updated.Status)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/alerts/"+alertID+"/ack", nil)
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("second ack status = %d", rec.Code)
	}
}

func TestHandleAlertResolve(t *testing.T) {
	dir := t.TempDir()
	hist, err := history.Open(dir+"/test.db", "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer hist.Close()

	ev := alert.Event{
		AgentID:   "a1",
		AlertType: alert.AlertTypeCPUHigh,
		Severity:  alert.SeverityWarning,
	}
	if err := hist.SaveAlertEvent(ev, history.AlertStatusOpen); err != nil {
		t.Fatal(err)
	}
	alerts, err := hist.ListAlerts("", "", "", 10)
	if err != nil || len(alerts) != 1 {
		t.Fatalf("alerts = %+v err=%v", alerts, err)
	}
	alertID := alerts[0].ID

	deps := testDeps(appmode.Hub, config.Config{}, nil, nil, nil)
	deps.History = hist
	srv := NewServer(deps)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/alerts/"+alertID+"/resolve", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("resolve status = %d body=%s", rec.Code, rec.Body.String())
	}
	var updated history.AlertRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &updated); err != nil {
		t.Fatal(err)
	}
	if updated.Status != history.AlertStatusResolved || updated.ResolvedAt == "" {
		t.Fatalf("status = %+v", updated)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/alerts/"+alertID+"/resolve", nil)
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("second resolve status = %d", rec.Code)
	}
}

func TestHandleAlertSilence(t *testing.T) {
	silences := alert.LoadSilenceStore(nil)
	deps := testDeps(appmode.Hub, config.Config{}, nil, nil, nil)
	deps.AlertSilences = silences
	srv := NewServer(deps)

	body, _ := json.Marshal(map[string]any{
		"agentId":         "a1",
		"ruleId":          alert.AlertTypeCPUHigh,
		"durationMinutes": 60,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/alerts/silence", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("silence status = %d body=%s", rec.Code, rec.Body.String())
	}
	if !silences.IsSilenced("a1", alert.AlertTypeCPUHigh) {
		t.Fatal("expected active silence")
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/alerts/silences", nil)
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d", rec.Code)
	}
	var listed []alert.SilenceEntry
	if err := json.Unmarshal(rec.Body.Bytes(), &listed); err != nil {
		t.Fatal(err)
	}
	if len(listed) != 1 {
		t.Fatalf("listed = %+v", listed)
	}
}

type recordingNotifier struct {
	events []alert.Event
}

func (r *recordingNotifier) Notify(_ context.Context, ev alert.Event) error {
	r.events = append(r.events, ev)
	return nil
}
