package history

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func TestUpsertAgentAndRestartHydrate(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "catalog.db")

	store1, err := Open(dbPath, "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	collectedAt := time.Now().UTC().Add(-2 * time.Hour).Format(time.RFC3339Nano)
	snap := payload.Snapshot{
		CollectedAt: collectedAt,
		Payload: payload.MetricsPayload{
			CPULoad:     42,
			UsedMemory:  512,
			TotalMemory: 1024,
		},
	}
	if err := store1.WriteSample("agent-offline", snap); err != nil {
		t.Fatal(err)
	}
	if err := store1.UpsertAgent("agent-offline", "offline-host", snap); err != nil {
		t.Fatal(err)
	}
	if err := store1.Close(); err != nil {
		t.Fatal(err)
	}

	store2, err := Open(dbPath, "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store2.Close()

	agents, err := store2.ListKnownAgents()
	if err != nil {
		t.Fatal(err)
	}
	if len(agents) != 1 {
		t.Fatalf("agents = %+v", agents)
	}
	if agents[0].AgentID != "agent-offline" || agents[0].Hostname != "offline-host" {
		t.Fatalf("agent row = %+v", agents[0])
	}
	if agents[0].CPULoad != 42 {
		t.Fatalf("cpu = %v", agents[0].CPULoad)
	}

	latest, ok, err := store2.LatestSample("agent-offline")
	if err != nil {
		t.Fatal(err)
	}
	if !ok || latest.Payload.CPULoad != 42 {
		t.Fatalf("latest = %+v ok=%v", latest, ok)
	}
}

func TestBackfillAgentCatalog(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(filepath.Join(dir, "backfill.db"), "full", 30)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	snap := payload.Snapshot{
		CollectedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Payload:     payload.MetricsPayload{CPULoad: 10},
	}
	if err := store.WriteSample("legacy-agent", snap); err != nil {
		t.Fatal(err)
	}
	if err := store.BackfillAgentCatalog(); err != nil {
		t.Fatal(err)
	}
	agents, err := store.ListKnownAgents()
	if err != nil {
		t.Fatal(err)
	}
	if len(agents) != 1 || agents[0].AgentID != "legacy-agent" {
		t.Fatalf("agents = %+v", agents)
	}
}
