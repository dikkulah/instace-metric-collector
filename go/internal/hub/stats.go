package hub

import "sync/atomic"

// Stats tracks hub ingest and alert counters.
type Stats struct {
	ingestTotal     atomic.Uint64
	ingestErrors    atomic.Uint64
	alertDispatched atomic.Uint64
	alertFailed     atomic.Uint64
}

func NewStats() *Stats { return &Stats{} }

func (s *Stats) RecordIngestOK()     { s.ingestTotal.Add(1) }
func (s *Stats) RecordIngestError()  { s.ingestErrors.Add(1) }
func (s *Stats) RecordAlertOK()      { s.alertDispatched.Add(1) }
func (s *Stats) RecordAlertFailed()  { s.alertFailed.Add(1) }

type StatsSnapshot struct {
	AgentCount      int    `json:"agentCount"`
	IngestTotal     uint64 `json:"ingestTotal"`
	IngestErrors    uint64 `json:"ingestErrors"`
	AlertDispatched uint64 `json:"alertDispatched"`
	AlertFailed     uint64 `json:"alertFailed"`
	AlertQueueDepth int    `json:"alertQueueDepth"`
}

func (s *Stats) Snapshot(agentCount int) StatsSnapshot {
	if s == nil {
		return StatsSnapshot{AgentCount: agentCount}
	}
	return StatsSnapshot{
		AgentCount:      agentCount,
		IngestTotal:     s.ingestTotal.Load(),
		IngestErrors:    s.ingestErrors.Load(),
		AlertDispatched: s.alertDispatched.Load(),
		AlertFailed:     s.alertFailed.Load(),
	}
}
