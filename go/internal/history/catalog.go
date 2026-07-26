package history

import (
	"database/sql"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

const catalogSchema = `
CREATE TABLE IF NOT EXISTS hub_agents (
  agent_id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  last_cpu REAL NOT NULL DEFAULT 0,
  last_memory_used INTEGER NOT NULL DEFAULT 0,
  last_memory_total INTEGER NOT NULL DEFAULT 0,
  last_containers INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_hub_agents_last_seen ON hub_agents(last_seen);
`

// AgentCatalogRecord is a persisted hub agent identity row.
type AgentCatalogRecord struct {
	AgentID        string
	Hostname       string
	FirstSeen      string
	LastSeen       string
	CPULoad        float64
	UsedMemory     int64
	TotalMemory    int64
	ContainerCount int
}

func (s *Store) ensureCatalogSchema() error {
	if s == nil || s.db == nil {
		return nil
	}
	_, err := s.db.Exec(catalogSchema)
	return err
}

// UpsertAgent records or updates agent identity on ingest.
func (s *Store) UpsertAgent(agentID, hostname string, snap payload.Snapshot) error {
	if s == nil || agentID == "" {
		return nil
	}
	if err := s.ensureCatalogSchema(); err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	if hostname == "" {
		hostname = agentID
	}
	lastSeen := snap.CollectedAt
	if lastSeen == "" {
		lastSeen = now
	}
	_, err := s.db.Exec(`
		INSERT INTO hub_agents
		(agent_id, hostname, first_seen, last_seen, last_cpu, last_memory_used, last_memory_total, last_containers)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(agent_id) DO UPDATE SET
			hostname = excluded.hostname,
			last_seen = excluded.last_seen,
			last_cpu = excluded.last_cpu,
			last_memory_used = excluded.last_memory_used,
			last_memory_total = excluded.last_memory_total,
			last_containers = excluded.last_containers`,
		agentID, hostname, lastSeen, lastSeen,
		snap.Payload.CPULoad, snap.Payload.UsedMemory, snap.Payload.TotalMemory, len(snap.Payload.Containers),
	)
	return err
}

// ListKnownAgents returns all agents in the persistent catalog.
func (s *Store) ListKnownAgents() ([]AgentCatalogRecord, error) {
	if s == nil {
		return nil, nil
	}
	if err := s.ensureCatalogSchema(); err != nil {
		return nil, err
	}
	rows, err := s.db.Query(`
		SELECT agent_id, hostname, first_seen, last_seen, last_cpu, last_memory_used, last_memory_total, last_containers
		FROM hub_agents ORDER BY last_seen DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AgentCatalogRecord
	for rows.Next() {
		var r AgentCatalogRecord
		if err := rows.Scan(&r.AgentID, &r.Hostname, &r.FirstSeen, &r.LastSeen,
			&r.CPULoad, &r.UsedMemory, &r.TotalMemory, &r.ContainerCount); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// LatestSample returns the most recent raw sample for an agent.
func (s *Store) LatestSample(agentID string) (payload.Snapshot, bool, error) {
	if s == nil {
		return payload.Snapshot{}, false, nil
	}
	samples, err := s.QuerySamples(agentID, "", "", 1)
	if err != nil {
		return payload.Snapshot{}, false, err
	}
	if len(samples) == 0 {
		return payload.Snapshot{}, false, nil
	}
	return samples[0], true, nil
}

// BackfillAgentCatalog seeds hub_agents from distinct raw_samples (one-time migration).
func (s *Store) BackfillAgentCatalog() error {
	if s == nil {
		return nil
	}
	if err := s.ensureCatalogSchema(); err != nil {
		return err
	}
	_, err := s.db.Exec(`
		INSERT INTO hub_agents (agent_id, hostname, first_seen, last_seen, last_cpu, last_memory_used, last_memory_total, last_containers)
		SELECT agent_id, agent_id, MIN(collected_at), MAX(collected_at),
		       COALESCE((SELECT cpu_load FROM raw_samples r2 WHERE r2.agent_id = raw_samples.agent_id ORDER BY collected_at DESC LIMIT 1), 0),
		       COALESCE((SELECT used_memory FROM raw_samples r2 WHERE r2.agent_id = raw_samples.agent_id ORDER BY collected_at DESC LIMIT 1), 0),
		       COALESCE((SELECT total_memory FROM raw_samples r2 WHERE r2.agent_id = raw_samples.agent_id ORDER BY collected_at DESC LIMIT 1), 0),
		       0
		FROM raw_samples
		GROUP BY agent_id
		ON CONFLICT(agent_id) DO NOTHING`)
	return err
}

// CatalogAgent returns one catalog row if present.
func (s *Store) CatalogAgent(agentID string) (AgentCatalogRecord, bool, error) {
	if s == nil || agentID == "" {
		return AgentCatalogRecord{}, false, nil
	}
	if err := s.ensureCatalogSchema(); err != nil {
		return AgentCatalogRecord{}, false, err
	}
	var r AgentCatalogRecord
	err := s.db.QueryRow(`
		SELECT agent_id, hostname, first_seen, last_seen, last_cpu, last_memory_used, last_memory_total, last_containers
		FROM hub_agents WHERE agent_id = ?`, agentID).Scan(
		&r.AgentID, &r.Hostname, &r.FirstSeen, &r.LastSeen,
		&r.CPULoad, &r.UsedMemory, &r.TotalMemory, &r.ContainerCount,
	)
	if err == sql.ErrNoRows {
		return AgentCatalogRecord{}, false, nil
	}
	if err != nil {
		return AgentCatalogRecord{}, false, err
	}
	return r, true, nil
}
