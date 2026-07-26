package alert

import (
	"context"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func TestSustainedTrackerAvgRequiresCoverage(t *testing.T) {
	tr := NewSustainedTracker()
	now := time.Date(2026, 7, 26, 12, 0, 0, 0, time.UTC)
	window := 5 * time.Minute

	tr.Record("a1", sustainedMetricCPU, 95, now.Add(-4*time.Minute))
	tr.Record("a1", sustainedMetricCPU, 96, now)

	avg, samples, ok := tr.Avg("a1", sustainedMetricCPU, window, now)
	if !ok {
		t.Fatalf("expected covered window, samples=%d", samples)
	}
	if samples != 2 || avg < 95 || avg > 96 {
		t.Fatalf("avg=%v samples=%d", avg, samples)
	}

	tr2 := NewSustainedTracker()
	tr2.Record("a1", sustainedMetricCPU, 95, now.Add(-1*time.Minute))
	tr2.Record("a1", sustainedMetricCPU, 96, now)
	_, _, ok = tr2.Avg("a1", sustainedMetricCPU, window, now)
	if ok {
		t.Fatal("expected insufficient span")
	}
}

func TestCPUHighRuleSustained(t *testing.T) {
	rule := &CPUHighRule{cfg: testConfig(90, 90, 90)}
	tr := NewSustainedTracker()
	now := time.Date(2026, 7, 26, 12, 0, 0, 0, time.UTC)
	window := 5 * time.Minute

	tr.Record("a1", sustainedMetricCPU, 95, now.Add(-4*time.Minute))
	tr.Record("a1", sustainedMetricCPU, 96, now)

	ctx := EvalContext{
		AgentID: "a1",
		Snapshot: payloadSnapshot(97),
		Sustained:       tr,
		SustainedWindow: window,
		Now:             now,
	}
	evs := rule.Evaluate(ctx)
	if len(evs) != 1 || evs[0].Details["avgCpuLoad"] == nil {
		t.Fatalf("events = %+v", evs)
	}

	tr2 := NewSustainedTracker()
	tr2.Record("a1", sustainedMetricCPU, 95, now)
	noAlert := rule.Evaluate(EvalContext{
		AgentID:         "a1",
		Snapshot:        payloadSnapshot(95),
		Sustained:       tr2,
		SustainedWindow: window,
		Now:             now,
	})
	if len(noAlert) != 0 {
		t.Fatalf("expected no alert before window covered: %+v", noAlert)
	}
}

func payloadSnapshot(cpu float64) payload.Snapshot {
	return payload.Snapshot{
		CollectedAt: "t",
		Payload:     payload.MetricsPayload{CPULoad: cpu},
	}
}

func TestEngineSustainedWindowBlocksInstantAlert(t *testing.T) {
	rec := &recordingNotifier{}
	cfg := testConfig(50, 90, 90)
	engine := NewEngine(DefaultRules(cfg), rec, cfg, testLogger())
	engine.SetSustainedWindow(5 * time.Minute)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go engine.Run(ctx)

	engine.OnIngest("a1", "host", payload.Snapshot{
		CollectedAt: "t",
		Payload:     payload.MetricsPayload{CPULoad: 99},
	})
	time.Sleep(100 * time.Millisecond)
	if len(rec.snapshot()) != 0 {
		t.Fatalf("expected no instant alert with sustained window, got %d", len(rec.snapshot()))
	}
}
