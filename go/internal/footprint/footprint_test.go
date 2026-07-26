package footprint

import (
	"testing"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func TestApplySetsSelfMetrics(t *testing.T) {
	var p payload.MetricsPayload
	Apply(&p, 42)
	if p.AgentMemoryBytes <= 0 {
		t.Fatalf("agentMemoryBytes = %d", p.AgentMemoryBytes)
	}
	if p.AgentGoroutines <= 0 {
		t.Fatalf("agentGoroutines = %d", p.AgentGoroutines)
	}
	if p.CollectDurationMs != 42 {
		t.Fatalf("collectDurationMs = %d", p.CollectDurationMs)
	}
}
