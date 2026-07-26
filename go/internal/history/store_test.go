package history

import (
	"os"
	"path/filepath"
	"testing"
	"time"

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
