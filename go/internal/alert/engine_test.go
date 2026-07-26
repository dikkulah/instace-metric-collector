package alert

import (
	"context"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

type recordingNotifier struct {
	mu     sync.Mutex
	events []Event
}

func (r *recordingNotifier) Notify(_ context.Context, ev Event) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = append(r.events, ev)
	return nil
}

func (r *recordingNotifier) snapshot() []Event {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Event, len(r.events))
	copy(out, r.events)
	return out
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func testConfig(cpu, memPct, disk float64) *ConfigStore {
	return NewConfigStore(ConfigSnapshot{
		CPUPercent:              cpu,
		MemoryPercent:           memPct,
		DiskPercent:             disk,
		CooldownMinutes:         1,
		StaleMultiplier:         2,
		CPUSpikeMinPercent:      50,
		MemoryPressurePercent:   85,
		DiskFillingPercent:      85,
		ContainerRestartCount: 3,
	})
}

func TestCPUHighRulePercentScale(t *testing.T) {
	rule := &CPUHighRule{cfg: testConfig(90, 90, 90)}
	noAlert := rule.Evaluate(EvalContext{
		AgentID: "a1",
		Snapshot: payload.Snapshot{
			CollectedAt: "t",
			Payload:     payload.MetricsPayload{CPULoad: 85},
		},
	})
	if len(noAlert) != 0 {
		t.Fatalf("expected no alert at 85%%, got %+v", noAlert)
	}
	evs := rule.Evaluate(EvalContext{
		AgentID: "a1",
		Snapshot: payload.Snapshot{
			CollectedAt: "t",
			Payload:     payload.MetricsPayload{CPULoad: 95},
		},
	})
	if len(evs) != 1 || evs[0].AlertType != AlertTypeCPUHigh {
		t.Fatalf("events = %+v", evs)
	}
}

func TestMemoryHighRule(t *testing.T) {
	rule := &MemoryHighRule{cfg: testConfig(90, 90, 90)}
	evs := rule.Evaluate(EvalContext{
		AgentID: "a1",
		Snapshot: payload.Snapshot{
			CollectedAt: "t",
			Payload: payload.MetricsPayload{
				UsedMemory:  950,
				TotalMemory: 1000,
			},
		},
	})
	if len(evs) != 1 || evs[0].AlertType != AlertTypeMemoryHigh {
		t.Fatalf("events = %+v", evs)
	}
}

func TestDiskHighRule(t *testing.T) {
	rule := &DiskHighRule{cfg: testConfig(90, 90, 90)}
	evs := rule.Evaluate(EvalContext{
		AgentID: "a1",
		Snapshot: payload.Snapshot{
			CollectedAt: "t",
			Payload: payload.MetricsPayload{
				DiskUsage: []payload.DiskUsageInfo{{Mount: "/", UsePercent: 94}},
			},
		},
	})
	if len(evs) != 1 || evs[0].AlertType != AlertTypeDiskHigh {
		t.Fatalf("events = %+v", evs)
	}
}

func TestContainerStateRule(t *testing.T) {
	rule := &ContainerStateRule{}
	evs := rule.Evaluate(EvalContext{
		AgentID: "a1",
		Snapshot: payload.Snapshot{
			CollectedAt: "t",
			Payload: payload.MetricsPayload{
				Containers: []payload.ContainerInfo{
					{ID: "c1", Name: "api", Status: "exited"},
					{ID: "c2", Name: "db", Status: "running", Health: "unhealthy"},
				},
			},
		},
	})
	if len(evs) != 2 {
		t.Fatalf("events = %+v", evs)
	}
}

func TestEngineCooldownDedup(t *testing.T) {
	rec := &recordingNotifier{}
	cfg := testConfig(50, 90, 90)
	engine := NewEngine(DefaultRules(cfg), rec, cfg, testLogger())
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go engine.Run(ctx)

	snap := payload.Snapshot{
		CollectedAt: "t",
		Payload:     payload.MetricsPayload{CPULoad: 99},
	}
	engine.OnIngest("a1", "host", snap)
	engine.OnIngest("a1", "host", snap)
	time.Sleep(100 * time.Millisecond)
	if len(rec.snapshot()) != 1 {
		t.Fatalf("expected 1 alert after dedup, got %d", len(rec.snapshot()))
	}
}

func TestAgentStaleRule(t *testing.T) {
	rule := &AgentStaleRule{}
	lastSeen := time.Now().UTC().Add(-5 * time.Minute)
	evs := rule.EvaluateStale("a1", "host", lastSeen, 2*time.Minute)
	if len(evs) != 1 || evs[0].AlertType != AlertTypeAgentStale {
		t.Fatalf("events = %+v", evs)
	}
}

func TestConfigStoreUpdate(t *testing.T) {
	cfg := testConfig(90, 90, 90)
	updated := cfg.Update(ConfigSnapshot{
		CPUPercent:            75,
		MemoryPercent:         80,
		DiskPercent:           85,
		CooldownMinutes:       5,
		StaleMultiplier:       3,
		CPUSpikeMinPercent:    40,
		MemoryPressurePercent: 80,
		DiskFillingPercent:    80,
		ContainerRestartCount: 5,
	})
	if updated.CPUPercent != 75 {
		t.Fatalf("cpu = %v", updated.CPUPercent)
	}
	if cfg.Thresholds().CPUPercent != 75 {
		t.Fatalf("threshold cpu = %v", cfg.Thresholds().CPUPercent)
	}
}
