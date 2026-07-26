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
	alerts, err := store.ListAlerts("agent-1", 10)
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
