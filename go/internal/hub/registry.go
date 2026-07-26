package hub

import (
	"sync"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
	"github.com/dikkulah/instance-metric-collector/go/internal/store"
)

// AgentSummary mirrors Java hub.AgentSummary.
type AgentSummary struct {
	AgentID        string  `json:"agentId"`
	Hostname       string  `json:"hostname"`
	LastSeen       string  `json:"lastSeen"`
	CPULoad        float64 `json:"cpuLoad"`
	UsedMemory     int64   `json:"usedMemory"`
	TotalMemory    int64   `json:"totalMemory"`
	ContainerCount int     `json:"containerCount"`
}

type agentEntry struct {
	summary  AgentSummary
	store    *store.SnapshotStore
}

// Registry tracks ingested agent snapshots.
type Registry struct {
	mu     sync.RWMutex
	agents map[string]*agentEntry
}

func NewRegistry() *Registry {
	return &Registry{agents: make(map[string]*agentEntry)}
}

func (r *Registry) Ingest(agentID, hostname string, snap payload.Snapshot) {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry, ok := r.agents[agentID]
	if !ok {
		entry = &agentEntry{store: store.NewSnapshotStore(120)}
		r.agents[agentID] = entry
	}
	entry.store.Push(snap)
	entry.summary = AgentSummary{
		AgentID:        agentID,
		Hostname:       hostname,
		LastSeen:       time.Now().UTC().Format(time.RFC3339Nano),
		CPULoad:        snap.Payload.CPULoad,
		UsedMemory:     snap.Payload.UsedMemory,
		TotalMemory:    snap.Payload.TotalMemory,
		ContainerCount: len(snap.Payload.Containers),
	}
}

func (r *Registry) ListAgents() []AgentSummary {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]AgentSummary, 0, len(r.agents))
	for _, e := range r.agents {
		out = append(out, e.summary)
	}
	return out
}

func (r *Registry) Latest(agentID string) (payload.Snapshot, bool) {
	r.mu.RLock()
	entry, ok := r.agents[agentID]
	r.mu.RUnlock()
	if !ok {
		return payload.Snapshot{}, false
	}
	return entry.store.Latest()
}

func (r *Registry) History(agentID string, limit int) []payload.Snapshot {
	r.mu.RLock()
	entry, ok := r.agents[agentID]
	r.mu.RUnlock()
	if !ok {
		return nil
	}
	return entry.store.History(limit)
}

// AgentSeen holds last-seen metadata for stale detection.
type AgentSeen struct {
	AgentID  string
	Hostname string
	LastSeen time.Time
}

// ListAgentSeen returns agents with parsed lastSeen timestamps.
func (r *Registry) ListAgentSeen() []AgentSeen {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]AgentSeen, 0, len(r.agents))
	for _, e := range r.agents {
		last, err := time.Parse(time.RFC3339Nano, e.summary.LastSeen)
		if err != nil {
			last, _ = time.Parse(time.RFC3339, e.summary.LastSeen)
		}
		out = append(out, AgentSeen{
			AgentID:  e.summary.AgentID,
			Hostname: e.summary.Hostname,
			LastSeen: last,
		})
	}
	return out
}
