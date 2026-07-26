package hub

import (
	"testing"
	"time"
)

func TestAgentStatusFromLastSeen(t *testing.T) {
	now := time.Now().UTC()
	staleAfter := 2 * time.Minute
	offlineAfter := 24 * time.Hour

	if got := AgentStatusFromLastSeen(now.Add(-30*time.Second), staleAfter, offlineAfter); got != AgentStatusLive {
		t.Fatalf("recent = %q", got)
	}
	if got := AgentStatusFromLastSeen(now.Add(-5*time.Minute), staleAfter, offlineAfter); got != AgentStatusStale {
		t.Fatalf("stale = %q", got)
	}
	if got := AgentStatusFromLastSeen(now.Add(-48*time.Hour), staleAfter, offlineAfter); got != AgentStatusOffline {
		t.Fatalf("offline = %q", got)
	}
	if got := AgentStatusFromLastSeen(time.Time{}, staleAfter, offlineAfter); got != AgentStatusOffline {
		t.Fatalf("zero = %q", got)
	}
}
