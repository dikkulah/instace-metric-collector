package alert

import (
	"sync"
	"time"
)

const sustainedMetricCPU = "cpu"
const sustainedMetricMemory = "memory"

type sustainedPoint struct {
	at    time.Time
	value float64
}

// SustainedTracker keeps a short rolling window of metric samples per agent (hub-only).
type SustainedTracker struct {
	mu     sync.Mutex
	series map[string][]sustainedPoint
}

func NewSustainedTracker() *SustainedTracker {
	return &SustainedTracker{series: make(map[string][]sustainedPoint)}
}

func sustainedKey(agentID, metric string) string {
	return agentID + "|" + metric
}

// Record appends a sample for sustained averaging.
func (t *SustainedTracker) Record(agentID, metric string, value float64, at time.Time) {
	if t == nil || agentID == "" || metric == "" {
		return
	}
	if at.IsZero() {
		at = time.Now().UTC()
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	key := sustainedKey(agentID, metric)
	t.series[key] = append(t.series[key], sustainedPoint{at: at.UTC(), value: value})
}

// Avg returns the average over the window when coverage is sufficient.
// covered is true when samples span at least 80% of the window with 2+ points.
func (t *SustainedTracker) Avg(agentID, metric string, window time.Duration, now time.Time) (avg float64, samples int, covered bool) {
	if t == nil || window <= 0 || agentID == "" || metric == "" {
		return 0, 0, false
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	cutoff := now.Add(-window)
	t.mu.Lock()
	defer t.mu.Unlock()
	key := sustainedKey(agentID, metric)
	points := pruneSustained(t.series[key], cutoff)
	t.series[key] = points
	if len(points) < 2 {
		return 0, len(points), false
	}
	span := points[len(points)-1].at.Sub(points[0].at)
	if span < window*8/10 {
		return 0, len(points), false
	}
	var sum float64
	for _, p := range points {
		sum += p.value
	}
	return sum / float64(len(points)), len(points), true
}

func pruneSustained(points []sustainedPoint, cutoff time.Time) []sustainedPoint {
	i := 0
	for _, p := range points {
		if !p.at.Before(cutoff) {
			points[i] = p
			i++
		}
	}
	return points[:i]
}
