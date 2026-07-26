package history

import "fmt"

// Insight mirrors diagnostic_insights row for persistence and API responses.
type Insight struct {
	ID         string         `json:"id"`
	AgentID    string         `json:"agentId"`
	Type       string         `json:"type"`
	Severity   string         `json:"severity"`
	DetectedAt string         `json:"detectedAt"`
	SummaryKey string         `json:"summaryKey"`
	Details    map[string]any `json:"details"`
}

// InsightDedupeKey returns a stable identity for one distinct issue (not per DB row id).
func InsightDedupeKey(ins Insight) string {
	d := ins.Details
	if d == nil {
		d = map[string]any{}
	}
	switch ins.Type {
	case "DISK_FILLING":
		return ins.Type + "|" + fmt.Sprint(d["mount"])
	case "CONTAINER_FLAP":
		id := d["containerId"]
		if id == nil || fmt.Sprint(id) == "" {
			id = d["containerName"]
		}
		return ins.Type + "|" + fmt.Sprint(id)
	case "CONNECTIVITY_FAIL":
		return ins.Type + "|" + fmt.Sprint(d["target"])
	default:
		return ins.Type
	}
}
