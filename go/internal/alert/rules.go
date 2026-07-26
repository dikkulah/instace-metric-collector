package alert

import (
	"strings"
	"time"
)

// DefaultRules returns the G5 rule set wired to a live config store.
func DefaultRules(cfg *ConfigStore) []Rule {
	if cfg == nil {
		cfg = NewConfigStore(DefaultConfigFromEnv(90, 0.9, 90, 2, 10*time.Minute))
	}
	return []Rule{
		&CPUHighRule{cfg: cfg},
		&MemoryHighRule{cfg: cfg},
		&DiskHighRule{cfg: cfg},
		&ContainerStateRule{},
		&AgentStaleRule{},
	}
}

type CPUHighRule struct {
	cfg *ConfigStore
}

func (r *CPUHighRule) ID() string { return "cpu-high" }

func (r *CPUHighRule) Evaluate(ctx EvalContext) []Event {
	th := r.cfg.Thresholds().CPUPercent
	if ctx.Snapshot.Payload.CPULoad <= th {
		return nil
	}
	return []Event{{
		AgentID:     ctx.AgentID,
		AlertType:   AlertTypeCPUHigh,
		Severity:    SeverityWarning,
		Message:     "CPU load above threshold",
		CollectedAt: ctx.Snapshot.CollectedAt,
		Details: map[string]any{
			"cpuLoad":   ctx.Snapshot.Payload.CPULoad,
			"threshold": th,
		},
	}}
}

type MemoryHighRule struct {
	cfg *ConfigStore
}

func (r *MemoryHighRule) ID() string { return "memory-high" }

func (r *MemoryHighRule) Evaluate(ctx EvalContext) []Event {
	th := r.cfg.Thresholds().MemoryPercent
	total := ctx.Snapshot.Payload.TotalMemory
	if total <= 0 {
		return nil
	}
	ratio := float64(ctx.Snapshot.Payload.UsedMemory) / float64(total)
	if ratio <= th {
		return nil
	}
	return []Event{{
		AgentID:     ctx.AgentID,
		AlertType:   AlertTypeMemoryHigh,
		Severity:    SeverityWarning,
		Message:     "Memory usage above threshold",
		CollectedAt: ctx.Snapshot.CollectedAt,
		Details: map[string]any{
			"usedMemory":  ctx.Snapshot.Payload.UsedMemory,
			"totalMemory": total,
			"ratio":       ratio,
			"threshold":   th,
		},
	}}
}

type DiskHighRule struct {
	cfg *ConfigStore
}

func (r *DiskHighRule) ID() string { return "disk-high" }

func (r *DiskHighRule) Evaluate(ctx EvalContext) []Event {
	th := r.cfg.Thresholds().DiskPercent
	var out []Event
	for _, d := range ctx.Snapshot.Payload.DiskUsage {
		if d.Mount != "/" && d.Mount != "" {
			continue
		}
		if d.UsePercent <= th {
			continue
		}
		out = append(out, Event{
			AgentID:     ctx.AgentID,
			AlertType:   AlertTypeDiskHigh,
			Severity:    SeverityCritical,
			Message:     "Disk usage above threshold",
			CollectedAt: ctx.Snapshot.CollectedAt,
			Details: map[string]any{
				"mount":      d.Mount,
				"usePercent": d.UsePercent,
				"threshold":  th,
			},
		})
	}
	return out
}

type ContainerStateRule struct{}

func (r *ContainerStateRule) ID() string { return "container-state" }

func (r *ContainerStateRule) Evaluate(ctx EvalContext) []Event {
	var out []Event
	for _, c := range ctx.Snapshot.Payload.Containers {
		status := strings.ToLower(c.Status)
		health := strings.ToLower(c.Health)
		if strings.Contains(status, "exit") {
			out = append(out, Event{
				AgentID:     ctx.AgentID,
				AlertType:   AlertTypeContainerExited,
				Severity:    SeverityCritical,
				Message:     "Container exited",
				CollectedAt: ctx.Snapshot.CollectedAt,
				Details: map[string]any{
					"containerId":   c.ID,
					"containerName": c.Name,
					"status":        c.Status,
				},
			})
		}
		if health == "unhealthy" {
			out = append(out, Event{
				AgentID:     ctx.AgentID,
				AlertType:   AlertTypeContainerUnhealthy,
				Severity:    SeverityWarning,
				Message:     "Container unhealthy",
				CollectedAt: ctx.Snapshot.CollectedAt,
				Details: map[string]any{
					"containerId":   c.ID,
					"containerName": c.Name,
					"health":        c.Health,
				},
			})
		}
	}
	return out
}

type AgentStaleRule struct{}

func (r *AgentStaleRule) ID() string { return "agent-stale" }

func (r *AgentStaleRule) Evaluate(_ EvalContext) []Event { return nil }

func (r *AgentStaleRule) EvaluateStale(agentID, hostname string, lastSeen time.Time, staleAfter time.Duration) []Event {
	if time.Since(lastSeen) <= staleAfter {
		return nil
	}
	return []Event{{
		AgentID:     agentID,
		AlertType:   AlertTypeAgentStale,
		Severity:    SeverityCritical,
		Message:     "Agent has not reported recently",
		CollectedAt: lastSeen.UTC().Format(time.RFC3339Nano),
		Details: map[string]any{
			"hostname":   hostname,
			"lastSeen":   lastSeen.UTC().Format(time.RFC3339Nano),
			"staleAfter": staleAfter.String(),
		},
	}}
}
