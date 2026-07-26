package web

import (
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/hub"
)

func (s *Server) agentStaleAfter() time.Duration {
	if s.deps.AlertConfig != nil {
		return s.deps.AlertConfig.StaleAfter(s.deps.Config.MetricsCollectionPeriod)
	}
	return time.Duration(float64(s.deps.Config.MetricsCollectionPeriod) * s.deps.Config.AlertsStaleMultiplier)
}

func (s *Server) agentOfflineAfter() time.Duration {
	if s.deps.Config.HubOfflineAfter > 0 {
		return s.deps.Config.HubOfflineAfter
	}
	return 24 * time.Hour
}

func (s *Server) listAgentsWithStatus() []hub.AgentSummary {
	if s.deps.Registry == nil {
		return nil
	}
	staleAfter := s.agentStaleAfter()
	offlineAfter := s.agentOfflineAfter()
	live := s.deps.Registry.ListAgents()

	if s.deps.History == nil {
		out := make([]hub.AgentSummary, len(live))
		for i, a := range live {
			a.Status = hub.AgentStatusFromLastSeen(hub.ParseLastSeen(a.LastSeen), staleAfter, offlineAfter)
			out[i] = a
		}
		return out
	}

	catalog, err := s.deps.History.ListKnownAgents()
	if err != nil {
		out := make([]hub.AgentSummary, len(live))
		for i, a := range live {
			a.Status = hub.AgentStatusFromLastSeen(hub.ParseLastSeen(a.LastSeen), staleAfter, offlineAfter)
			out[i] = a
		}
		return out
	}
	if len(live) == 0 {
		return hub.SummariesFromCatalog(catalog, staleAfter, offlineAfter)
	}
	return hub.MergeAgentSummaries(catalog, live, staleAfter, offlineAfter)
}

func (s *Server) agentSummaryByID(agentID string) (hub.AgentSummary, bool) {
	for _, a := range s.listAgentsWithStatus() {
		if a.AgentID == agentID {
			return a, true
		}
	}
	return hub.AgentSummary{}, false
}
