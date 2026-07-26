package history

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func TestRunHourlyRollup(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(filepath.Join(dir, "rollup.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	hour := time.Now().UTC().Truncate(time.Hour).Add(-2 * time.Hour)
	for i := 0; i < 3; i++ {
		ts := hour.Add(time.Duration(i*10) * time.Minute).Format(time.RFC3339Nano)
		snap := payload.Snapshot{
			CollectedAt: ts,
			Payload: payload.MetricsPayload{
				CPULoad:     float64(40 + i*10),
				UsedMemory:  100,
				TotalMemory: 200,
			},
		}
		if err := store.WriteSample("agent-1", snap); err != nil {
			t.Fatal(err)
		}
	}

	if err := store.RunHourlyRollup(context.Background()); err != nil {
		t.Fatal(err)
	}

	hourly, err := store.QueryHourlyRollup("agent-1", "", "", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(hourly) != 1 {
		t.Fatalf("hourly rows = %d, want 1", len(hourly))
	}
	if hourly[0].Payload.CPULoad < 40 || hourly[0].Payload.CPULoad > 60 {
		t.Fatalf("cpu avg = %v, want ~50", hourly[0].Payload.CPULoad)
	}

	raw, err := store.QuerySamplesWithResolution("agent-1", "", "", "raw", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(raw) != 3 {
		t.Fatalf("raw rows = %d, want 3", len(raw))
	}

	resolved, err := store.QuerySamplesWithResolution("agent-1", "", "", "hourly", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(resolved) != 1 {
		t.Fatalf("resolved hourly = %d, want 1", len(resolved))
	}
}

func TestQuerySamplesWithResolutionInvalid(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(filepath.Join(dir, "bad.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	_, err = store.QuerySamplesWithResolution("a", "", "", "daily", 10)
	if err == nil {
		t.Fatal("expected error for unsupported resolution")
	}
}
