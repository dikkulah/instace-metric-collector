package history

import (
	"context"
	"fmt"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

const rollupWatermarkKey = "rollup_watermark"

const rollupSchema = `
CREATE TABLE IF NOT EXISTS hourly_rollup (
  agent_id TEXT NOT NULL,
  hour_start TEXT NOT NULL,
  sample_count INTEGER NOT NULL,
  cpu_avg REAL NOT NULL,
  cpu_max REAL NOT NULL,
  memory_used_avg REAL NOT NULL,
  memory_total_avg REAL NOT NULL,
  PRIMARY KEY (agent_id, hour_start)
);
CREATE INDEX IF NOT EXISTS idx_hourly_rollup_agent_time ON hourly_rollup(agent_id, hour_start);
`

func (s *Store) ensureRollupSchema() error {
	if s == nil || s.db == nil {
		return nil
	}
	_, err := s.db.Exec(rollupSchema)
	return err
}

// RunHourlyRollup aggregates completed hours from raw_samples into hourly_rollup.
func (s *Store) RunHourlyRollup(ctx context.Context) error {
	if s == nil || s.profile == "minimal" {
		return nil
	}
	if err := s.ensureRollupSchema(); err != nil {
		return err
	}

	end := time.Now().UTC().Truncate(time.Hour)
	start, err := s.rollupWatermark(end)
	if err != nil {
		return err
	}

	for hour := start; hour.Before(end); hour = hour.Add(time.Hour) {
		if err := s.rollupHour(ctx, hour); err != nil {
			return err
		}
	}
	return s.saveRollupWatermark(end)
}

func (s *Store) rollupWatermark(end time.Time) (time.Time, error) {
	var wm string
	ok, err := s.GetSetting(rollupWatermarkKey, &wm)
	if err != nil {
		return time.Time{}, err
	}
	if ok && wm != "" {
		t, err := time.Parse(time.RFC3339, wm)
		if err == nil {
			return t.UTC().Truncate(time.Hour), nil
		}
	}
	// First run: rollup from 24h ago or earliest sample.
	defaultStart := end.Add(-24 * time.Hour)
	var earliest string
	err = s.db.QueryRowContext(context.Background(),
		`SELECT MIN(collected_at) FROM raw_samples`).Scan(&earliest)
	if err != nil || earliest == "" {
		return defaultStart, nil
	}
	t, err := time.Parse(time.RFC3339Nano, earliest)
	if err != nil {
		t, err = time.Parse(time.RFC3339, earliest)
	}
	if err != nil {
		return defaultStart, nil
	}
	t = t.UTC().Truncate(time.Hour)
	if t.After(defaultStart) {
		return t, nil
	}
	return defaultStart, nil
}

func (s *Store) saveRollupWatermark(t time.Time) error {
	return s.SaveSetting(rollupWatermarkKey, t.UTC().Format(time.RFC3339))
}

func (s *Store) rollupHour(ctx context.Context, hour time.Time) error {
	from := hour.UTC().Format(time.RFC3339)
	to := hour.Add(time.Hour).UTC().Format(time.RFC3339)
	hourKey := hour.UTC().Format(time.RFC3339)

	rows, err := s.db.QueryContext(ctx, `
		SELECT agent_id,
		       COUNT(*) AS sample_count,
		       AVG(cpu_load) AS cpu_avg,
		       MAX(cpu_load) AS cpu_max,
		       AVG(used_memory) AS memory_used_avg,
		       AVG(total_memory) AS memory_total_avg
		FROM raw_samples
		WHERE collected_at >= ? AND collected_at < ?
		GROUP BY agent_id`,
		from, to,
	)
	if err != nil {
		return err
	}

	type rollupRow struct {
		agentID    string
		sampleCnt  int
		cpuAvg     float64
		cpuMax     float64
		memUsed    float64
		memTotal   float64
	}
	var batch []rollupRow
	for rows.Next() {
		var row rollupRow
		if err := rows.Scan(&row.agentID, &row.sampleCnt, &row.cpuAvg, &row.cpuMax, &row.memUsed, &row.memTotal); err != nil {
			_ = rows.Close()
			return err
		}
		batch = append(batch, row)
	}
	if err := rows.Close(); err != nil {
		return err
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, row := range batch {
		_, err := s.db.ExecContext(ctx, `
			INSERT OR REPLACE INTO hourly_rollup
			(agent_id, hour_start, sample_count, cpu_avg, cpu_max, memory_used_avg, memory_total_avg)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			row.agentID, hourKey, row.sampleCnt, row.cpuAvg, row.cpuMax, row.memUsed, row.memTotal,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// QueryHourlyRollup returns downsampled snapshots from hourly_rollup.
func (s *Store) QueryHourlyRollup(agentID, from, to string, limit int) ([]payload.Snapshot, error) {
	if s == nil {
		return nil, nil
	}
	if err := s.ensureRollupSchema(); err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 500
	}
	q := `SELECT hour_start, cpu_avg, cpu_max, memory_used_avg, memory_total_avg
	      FROM hourly_rollup WHERE agent_id = ?`
	args := []any{agentID}
	if from != "" {
		q += ` AND hour_start >= ?`
		args = append(args, from)
	}
	if to != "" {
		q += ` AND hour_start <= ?`
		args = append(args, to)
	}
	q += ` ORDER BY hour_start DESC LIMIT ?`
	args = append(args, limit)

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []payload.Snapshot
	for rows.Next() {
		var hourStart string
		var cpuAvg, cpuMax, memUsed, memTotal float64
		if err := rows.Scan(&hourStart, &cpuAvg, &cpuMax, &memUsed, &memTotal); err != nil {
			return nil, err
		}
		out = append(out, payload.Snapshot{
			CollectedAt: hourStart,
			Payload: payload.MetricsPayload{
				CPULoad:     cpuAvg,
				UsedMemory:  int64(memUsed),
				TotalMemory: int64(memTotal),
			},
		})
		_ = cpuMax // reserved for future chart bands
	}
	return out, rows.Err()
}

// QuerySamplesWithResolution routes to raw or hourly store per ADR-012.
func (s *Store) QuerySamplesWithResolution(agentID, from, to, resolution string, limit int) ([]payload.Snapshot, error) {
	switch resolution {
	case "", "raw":
		return s.QuerySamples(agentID, from, to, limit)
	case "hourly":
		return s.QueryHourlyRollup(agentID, from, to, limit)
	default:
		return nil, fmt.Errorf("unsupported resolution: %s", resolution)
	}
}
