package hub

import "time"

const (
	AgentStatusLive    = "live"
	AgentStatusStale   = "stale"
	AgentStatusOffline = "offline"
)

// AgentStatusFromLastSeen maps lastSeen age to live/stale/offline.
func AgentStatusFromLastSeen(lastSeen time.Time, staleAfter, offlineAfter time.Duration) string {
	if lastSeen.IsZero() {
		return AgentStatusOffline
	}
	age := time.Since(lastSeen)
	if age < staleAfter {
		return AgentStatusLive
	}
	if age < offlineAfter {
		return AgentStatusStale
	}
	return AgentStatusOffline
}

// ParseLastSeen parses hub agent lastSeen timestamps.
func ParseLastSeen(iso string) time.Time {
	if iso == "" {
		return time.Time{}
	}
	t, err := time.Parse(time.RFC3339Nano, iso)
	if err != nil {
		t, _ = time.Parse(time.RFC3339, iso)
	}
	return t.UTC()
}
