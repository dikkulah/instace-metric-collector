package footprint

import (
	"runtime"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

// Apply sets additive agent self-metrics on the payload (ADR-013, V21).
func Apply(p *payload.MetricsPayload, collectDurationMs int64) {
	if p == nil {
		return
	}
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	p.AgentMemoryBytes = int64(ms.Alloc)
	p.AgentGoroutines = runtime.NumGoroutine()
	if collectDurationMs >= 0 {
		p.CollectDurationMs = collectDurationMs
	}
}
