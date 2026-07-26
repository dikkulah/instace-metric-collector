package history

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/alert"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func TestStoreWriteAndQuery(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	store, err := Open(dbPath, "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	snap := payload.Snapshot{
		CollectedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Payload: payload.MetricsPayload{
			CPULoad:     55,
			UsedMemory:  100,
			TotalMemory: 200,
		},
	}
	if err := store.WriteSample("agent-1", snap); err != nil {
		t.Fatal(err)
	}
	samples, err := store.QuerySamples("agent-1", "", "", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(samples) != 1 || samples[0].Payload.CPULoad != 55 {
		t.Fatalf("samples = %+v", samples)
	}
	_ = os.Remove(dbPath)
}

func TestAcknowledgeAlert(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(filepath.Join(dir, "alerts.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	ev := alert.Event{
		AgentID:   "agent-1",
		AlertType: alert.AlertTypeCPUHigh,
		Severity:  alert.SeverityWarning,
		Details:   map[string]any{"cpu": 95},
	}
	if err := store.SaveAlertEvent(ev, AlertStatusOpen); err != nil {
		t.Fatal(err)
	}
	alerts, err := store.ListAlerts("agent-1", "", "", 10)
	if err != nil || len(alerts) != 1 {
		t.Fatalf("list = %+v err=%v", alerts, err)
	}
	id := alerts[0].ID

	updated, err := store.AcknowledgeAlert(id)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Status != AlertStatusAck {
		t.Fatalf("status = %q", updated.Status)
	}

	_, err = store.AcknowledgeAlert(id)
	if err != ErrAlertNotAckable {
		t.Fatalf("second ack err = %v", err)
	}

	_, err = store.AcknowledgeAlert("missing-id")
	if err != ErrAlertNotFound {
		t.Fatalf("missing err = %v", err)
	}
}

func TestResolveAlert(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(filepath.Join(dir, "resolve.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	ev := alert.Event{
		AgentID:   "agent-1",
		AlertType: alert.AlertTypeCPUHigh,
		Severity:  alert.SeverityWarning,
	}
	if err := store.SaveAlertEvent(ev, AlertStatusOpen); err != nil {
		t.Fatal(err)
	}
	alerts, err := store.ListAlerts("agent-1", "", "", 10)
	if err != nil || len(alerts) != 1 {
		t.Fatalf("list = %+v err=%v", alerts, err)
	}
	id := alerts[0].ID

	resolved, err := store.ResolveAlert(id)
	if err != nil {
		t.Fatal(err)
	}
	if resolved.Status != AlertStatusResolved || resolved.ResolvedAt == "" {
		t.Fatalf("resolved = %+v", resolved)
	}

	_, err = store.ResolveAlert(id)
	if err != ErrAlertNotResolvable {
		t.Fatalf("second resolve err = %v", err)
	}
}

func TestResolveOpenAlerts(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(filepath.Join(dir, "open.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	ev := alert.Event{
		AgentID:   "agent-1",
		AlertType: alert.AlertTypeCPUHigh,
		Severity:  alert.SeverityWarning,
	}
	if err := store.SaveAlertEvent(ev, AlertStatusOpen); err != nil {
		t.Fatal(err)
	}
	n, err := store.ResolveOpenAlerts("agent-1", alert.AlertTypeCPUHigh)
	if err != nil || n != 1 {
		t.Fatalf("resolve open n=%d err=%v", n, err)
	}
	open, err := store.ListAlerts("agent-1", AlertStatusOpen, "", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(open) != 0 {
		t.Fatalf("expected no open alerts, got %+v", open)
	}
}

func TestGetInsight(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(filepath.Join(dir, "insight.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	ins := Insight{
		ID:         "agent-1|DISK_FILLING|/",
		AgentID:    "agent-1",
		Type:       "DISK_FILLING",
		Severity:   "critical",
		DetectedAt: time.Now().UTC().Format(time.RFC3339Nano),
		SummaryKey: "diagnostics.diskFilling",
		Details:    map[string]any{"mount": "/"},
	}
	if err := store.SaveInsight(ins); err != nil {
		t.Fatal(err)
	}
	got, err := store.GetInsight("agent-1", ins.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Type != "DISK_FILLING" {
		t.Fatalf("got = %+v", got)
	}
	_, err = store.GetInsight("agent-1", "missing")
	if err != ErrInsightNotFound {
		t.Fatalf("err = %v", err)
	}
}
