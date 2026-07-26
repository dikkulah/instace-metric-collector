package diagnostic

import (
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/history"
)

const diskTrendWindow = 24 * time.Hour

// diskFillProjection estimates days until 100% use from a linear trend over recent history.
func diskFillProjection(store *history.Store, agentID, mount string, currentPct float64) (days float64, ok bool) {
	if store == nil || currentPct >= 100 {
		return 0, false
	}
	from := time.Now().UTC().Add(-diskTrendWindow).Format(time.RFC3339Nano)
	samples, err := store.QuerySamples(agentID, from, "", 200)
	if err != nil || len(samples) < 3 {
		return 0, false
	}

	type point struct {
		t time.Time
		p float64
	}
	var pts []point
	for _, snap := range samples {
		ts, err := time.Parse(time.RFC3339Nano, snap.CollectedAt)
		if err != nil {
			continue
		}
		for _, d := range snap.Payload.DiskUsage {
			if diskMountMatch(d.Mount, mount) {
				pts = append(pts, point{t: ts, p: d.UsePercent})
				break
			}
		}
	}
	if len(pts) < 3 {
		return 0, false
	}

	t0 := pts[0].t
	var sumX, sumY, sumXX, sumXY float64
	n := float64(len(pts))
	for _, pt := range pts {
		x := pt.t.Sub(t0).Hours()
		sumX += x
		sumY += pt.p
		sumXX += x * x
		sumXY += x * pt.p
	}
	denom := n*sumXX - sumX*sumX
	if denom == 0 {
		return 0, false
	}
	slope := (n*sumXY - sumX*sumY) / denom
	if slope <= 0.01 {
		return 0, false
	}
	remaining := 100 - currentPct
	hours := remaining / slope
	return hours / 24, true
}

func diskMountMatch(sampleMount, target string) bool {
	if sampleMount == target {
		return true
	}
	if target == "/" && sampleMount == "" {
		return true
	}
	return false
}
