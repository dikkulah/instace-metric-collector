package hub

import (
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/history"
)

// MergeAgentSummaries overlays live registry data onto the persistent catalog.
func MergeAgentSummaries(catalog []history.AgentCatalogRecord, live []AgentSummary, staleAfter, offlineAfter time.Duration) []AgentSummary {
	byID := make(map[string]AgentSummary, len(catalog)+len(live))
	for _, rec := range catalog {
		byID[rec.AgentID] = AgentSummary{
			AgentID:        rec.AgentID,
			Hostname:       rec.Hostname,
			FirstSeen:      rec.FirstSeen,
			LastSeen:       rec.LastSeen,
			CPULoad:        rec.CPULoad,
			UsedMemory:     rec.UsedMemory,
			TotalMemory:    rec.TotalMemory,
			ContainerCount: rec.ContainerCount,
		}
	}
	for _, a := range live {
		if existing, ok := byID[a.AgentID]; ok {
			if existing.FirstSeen != "" {
				a.FirstSeen = existing.FirstSeen
			}
		}
		byID[a.AgentID] = a
	}
	out := make([]AgentSummary, 0, len(byID))
	for _, a := range byID {
		a.Status = AgentStatusFromLastSeen(ParseLastSeen(a.LastSeen), staleAfter, offlineAfter)
		out = append(out, a)
	}
	return out
}

// SummariesFromCatalog converts catalog rows to agent summaries.
func SummariesFromCatalog(catalog []history.AgentCatalogRecord, staleAfter, offlineAfter time.Duration) []AgentSummary {
	out := make([]AgentSummary, 0, len(catalog))
	for _, rec := range catalog {
		a := AgentSummary{
			AgentID:        rec.AgentID,
			Hostname:       rec.Hostname,
			FirstSeen:      rec.FirstSeen,
			LastSeen:       rec.LastSeen,
			CPULoad:        rec.CPULoad,
			UsedMemory:     rec.UsedMemory,
			TotalMemory:    rec.TotalMemory,
			ContainerCount: rec.ContainerCount,
		}
		a.Status = AgentStatusFromLastSeen(ParseLastSeen(a.LastSeen), staleAfter, offlineAfter)
		out = append(out, a)
	}
	return out
}
