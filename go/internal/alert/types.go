package alert

import (
	"context"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

type Severity string

const (
	SeverityInfo     Severity = "info"
	SeverityWarning  Severity = "warning"
	SeverityCritical Severity = "critical"
)

const (
	AlertTypeCPUHigh            = "CPU_HIGH"
	AlertTypeMemoryHigh         = "MEMORY_HIGH"
	AlertTypeContainerExited    = "CONTAINER_EXITED"
	AlertTypeContainerUnhealthy = "CONTAINER_UNHEALTHY"
	AlertTypeAgentStale         = "AGENT_STALE"
	AlertTypeDiskHigh           = "DISK_HIGH"
)

// Event matches the hub webhook payload contract (docs/HUB.md).
type Event struct {
	AgentID     string         `json:"agentId"`
	AlertType   string         `json:"alertType"`
	Severity    Severity       `json:"severity"`
	Message     string         `json:"message"`
	CollectedAt string         `json:"collectedAt"`
	Details     map[string]any `json:"details"`
}

// EvalContext is the input for rule evaluation — ingest data only (V16).
type EvalContext struct {
	AgentID  string
	Hostname string
	Snapshot payload.Snapshot
	LastSeen time.Time
}

// Rule evaluates a single threshold or state condition. Stateless; cooldown lives in Engine.
type Rule interface {
	ID() string
	Evaluate(ctx EvalContext) []Event
}

// AgentSeen is used by the stale-agent checker.
type AgentSeen struct {
	AgentID  string
	Hostname string
	LastSeen time.Time
}

// Thresholds holds alert rule thresholds (memory as 0–1 ratio).
type Thresholds struct {
	CPUPercent    float64
	MemoryPercent float64
	DiskPercent   float64
}

// Notifier delivers alert events to an external channel (webhook, email, etc.).
type Notifier interface {
	Notify(ctx context.Context, ev Event) error
}
