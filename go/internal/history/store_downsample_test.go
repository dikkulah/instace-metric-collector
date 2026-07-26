package history

import (
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func TestQuerySamplesRangeDownsampled(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(filepath.Join(dir, "downsample.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	base := time.Now().UTC().Add(-2 * time.Hour).Truncate(time.Second)
	for i := 0; i < 100; i++ {
		ts := base.Add(time.Duration(i) * time.Minute).Format(time.RFC3339Nano)
		if err := store.WriteSample("agent-1", payload.Snapshot{
			CollectedAt: ts,
			Payload:     payload.MetricsPayload{CPULoad: float64(i), UsedMemory: 50, TotalMemory: 100},
		}); err != nil {
			t.Fatal(err)
		}
	}

	from := base.Format(time.RFC3339Nano)
	to := base.Add(99 * time.Minute).Format(time.RFC3339Nano)
	out, err := store.QuerySamples("agent-1", from, to, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 10 {
		t.Fatalf("len = %d, want 10", len(out))
	}
	first := out[0].CollectedAt
	last := out[len(out)-1].CollectedAt
	if first >= last {
		t.Fatalf("not spread across range: first=%s last=%s", first, last)
	}
	if out[0].Payload.CPULoad != 0 {
		t.Fatalf("first cpu = %v, want 0", out[0].Payload.CPULoad)
	}
	if out[9].Payload.CPULoad != 99 {
		t.Fatalf("last cpu = %v, want 99", out[9].Payload.CPULoad)
	}
}

func TestDownsampleSnapshots(t *testing.T) {
	samples := make([]payload.Snapshot, 5)
	for i := range samples {
		samples[i] = payload.Snapshot{CollectedAt: fmt.Sprintf("t%d", i)}
	}
	out := downsampleSnapshots(samples, 3)
	if len(out) != 3 || out[0].CollectedAt != "t0" || out[2].CollectedAt != "t4" {
		t.Fatalf("got %+v", out)
	}
}
