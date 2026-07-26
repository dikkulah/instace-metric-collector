package diagnostic

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/alert"
	"github.com/dikkulah/instance-metric-collector/go/internal/history"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func testConfig() *alert.ConfigStore {
	return alert.NewConfigStore(alert.ConfigSnapshot{
		CPUPercent:              90,
		MemoryPercent:           0.9,
		DiskPercent:             90,
		CooldownMinutes:         10,
		StaleMultiplier:         2,
		CPUSpikeMinPercent:      50,
		MemoryPressurePercent:   85,
		DiskFillingPercent:      85,
		ContainerRestartCount:   3,
	})
}

func TestEvaluateCPUSpike(t *testing.T) {
	engine := NewEngine(nil, testConfig())
	prev := payload.Snapshot{Payload: payload.MetricsPayload{CPULoad: 30}}
	snap := payload.Snapshot{Payload: payload.MetricsPayload{CPULoad: 70}}
	out := engine.Evaluate("a1", snap, &prev)
	if len(out) != 1 || out[0].Type != "CPU_SPIKE" {
		t.Fatalf("insights = %+v", out)
	}
}

func TestEvaluateMemoryPressure(t *testing.T) {
	engine := NewEngine(nil, testConfig())
	snap := payload.Snapshot{
		Payload: payload.MetricsPayload{UsedMemory: 900, TotalMemory: 1000},
	}
	out := engine.Evaluate("a1", snap, nil)
	found := false
	for _, ins := range out {
		if ins.Type == "MEMORY_PRESSURE" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected MEMORY_PRESSURE, got %+v", out)
	}
}

func TestEvaluateContainerFlap(t *testing.T) {
	engine := NewEngine(nil, testConfig())
	snap := payload.Snapshot{
		Payload: payload.MetricsPayload{
			Containers: []payload.ContainerInfo{{ID: "c1", Name: "web", RestartCount: 5}},
		},
	}
	out := engine.Evaluate("a1", snap, nil)
	if len(out) != 1 || out[0].Type != "CONTAINER_FLAP" {
		t.Fatalf("insights = %+v", out)
	}
}

func TestEvaluateConnectivityFail(t *testing.T) {
	engine := NewEngine(nil, testConfig())
	snap := payload.Snapshot{
		Payload: payload.MetricsPayload{
			ConnectivityProbes: []payload.ConnectivityProbe{{Target: "db:5432", OK: false, Error: "timeout"}},
		},
	}
	out := engine.Evaluate("a1", snap, nil)
	if len(out) != 1 || out[0].Type != "CONNECTIVITY_FAIL" {
		t.Fatalf("insights = %+v", out)
	}
}

func TestDiskFillProjection(t *testing.T) {
	dir := t.TempDir()
	store, err := history.Open(filepath.Join(dir, "trend.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	now := time.Now().UTC()
	for i := 0; i < 5; i++ {
		at := now.Add(-time.Duration(4-i) * time.Hour).Format(time.RFC3339Nano)
		pct := 70 + float64(i)*3
		snap := payload.Snapshot{
			CollectedAt: at,
			Payload: payload.MetricsPayload{
				DiskUsage: []payload.DiskUsageInfo{{Mount: "/", UsePercent: pct, TotalBytes: 1000}},
			},
		}
		if err := store.WriteSample("a1", snap); err != nil {
			t.Fatal(err)
		}
	}

	days, ok := diskFillProjection(store, "a1", "/", 82)
	if !ok || days <= 0 {
		t.Fatalf("projection days=%v ok=%v", days, ok)
	}
}
