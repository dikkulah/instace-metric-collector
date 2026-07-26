package diagnostic

import (
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/alert"
	"github.com/dikkulah/instance-metric-collector/go/internal/history"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

// Insight is a rule-based diagnostic finding (Phase 12).
type Insight struct {
	ID         string         `json:"id"`
	AgentID    string         `json:"agentId"`
	Type       string         `json:"type"`
	Severity   string         `json:"severity"`
	DetectedAt string         `json:"detectedAt"`
	SummaryKey string         `json:"summaryKey"`
	Details    map[string]any `json:"details"`
}

// Engine evaluates diagnostics from the latest snapshot and short history.
type Engine struct {
	history *history.Store
	cfg     *alert.ConfigStore
}

func NewEngine(h *history.Store, cfg *alert.ConfigStore) *Engine {
	return &Engine{history: h, cfg: cfg}
}

func (e *Engine) thresholds() alert.DiagnosticThresholds {
	if e.cfg != nil {
		return e.cfg.Diagnostics()
	}
	return alert.DiagnosticThresholds{
		CPUSpikeMinPercent:    50,
		MemoryPressurePercent: 85,
		DiskFillingPercent:    85,
		ContainerRestartCount: 3,
	}
}

func stableInsightID(agentID, insightType string, parts ...string) string {
	id := agentID + "|" + insightType
	for _, p := range parts {
		id += "|" + p
	}
	return id
}

// Evaluate runs rule-based diagnostics for an agent after ingest.
func (e *Engine) Evaluate(agentID string, snap payload.Snapshot, prev *payload.Snapshot) []Insight {
	th := e.thresholds()
	var out []Insight
	now := time.Now().UTC().Format(time.RFC3339Nano)

	if prev != nil && prev.Payload.CPULoad > 0 && snap.Payload.CPULoad >= prev.Payload.CPULoad*2 && snap.Payload.CPULoad >= th.CPUSpikeMinPercent {
		out = append(out, Insight{
			ID:         stableInsightID(agentID, "CPU_SPIKE"),
			AgentID:    agentID,
			Type:       "CPU_SPIKE",
			Severity:   "warning",
			DetectedAt: now,
			SummaryKey: "diagnostics.cpuSpike",
			Details: map[string]any{
				"cpuLoad":     snap.Payload.CPULoad,
				"previousCpu": prev.Payload.CPULoad,
				"threshold":   th.CPUSpikeMinPercent,
			},
		})
	}

	if snap.Payload.TotalMemory > 0 {
		ratio := float64(snap.Payload.UsedMemory) / float64(snap.Payload.TotalMemory)
		memTh := th.MemoryPressurePercent / 100
		if ratio > memTh {
			out = append(out, Insight{
				ID:         stableInsightID(agentID, "MEMORY_PRESSURE"),
				AgentID:    agentID,
				Type:       "MEMORY_PRESSURE",
				Severity:   "warning",
				DetectedAt: now,
				SummaryKey: "diagnostics.memoryPressure",
				Details: map[string]any{
					"ratio":        ratio,
					"usedMemory":   snap.Payload.UsedMemory,
					"totalMemory":  snap.Payload.TotalMemory,
					"thresholdPct": th.MemoryPressurePercent,
				},
			})
		}
	}

	for _, d := range snap.Payload.DiskUsage {
		if d.UsePercent >= th.DiskFillingPercent {
			details := map[string]any{
				"mount":        d.Mount,
				"usePercent":   d.UsePercent,
				"totalBytes":   d.TotalBytes,
				"thresholdPct": th.DiskFillingPercent,
			}
			if days, ok := diskFillProjection(e.history, agentID, d.Mount, d.UsePercent); ok {
				details["daysUntilFull"] = days
			}
			out = append(out, Insight{
				ID:         stableInsightID(agentID, "DISK_FILLING", d.Mount),
				AgentID:    agentID,
				Type:       "DISK_FILLING",
				Severity:   "critical",
				DetectedAt: now,
				SummaryKey: "diagnostics.diskFilling",
				Details:    details,
			})
		}
	}

	for _, c := range snap.Payload.Containers {
		if c.RestartCount > th.ContainerRestartCount {
			out = append(out, Insight{
				ID:         stableInsightID(agentID, "CONTAINER_FLAP", c.ID),
				AgentID:    agentID,
				Type:       "CONTAINER_FLAP",
				Severity:   "warning",
				DetectedAt: now,
				SummaryKey: "diagnostics.containerFlap",
				Details: map[string]any{
					"containerId":   c.ID,
					"containerName": c.Name,
					"restartCount":  c.RestartCount,
					"threshold":     th.ContainerRestartCount,
				},
			})
		}
	}

	for _, p := range snap.Payload.ConnectivityProbes {
		if !p.OK {
			out = append(out, Insight{
				ID:         stableInsightID(agentID, "CONNECTIVITY_FAIL", p.Target),
				AgentID:    agentID,
				Type:       "CONNECTIVITY_FAIL",
				Severity:   "critical",
				DetectedAt: now,
				SummaryKey: "diagnostics.connectivityFail",
				Details: map[string]any{
					"target":  p.Target,
					"error":   p.Error,
					"latency": p.LatencyMs,
				},
			})
		}
	}

	if e.history != nil {
		for _, ins := range out {
			_ = e.history.SaveInsight(history.Insight{
				ID:         ins.ID,
				AgentID:    ins.AgentID,
				Type:       ins.Type,
				Severity:   ins.Severity,
				DetectedAt: ins.DetectedAt,
				SummaryKey: ins.SummaryKey,
				Details:    ins.Details,
			})
		}
	}
	return out
}
