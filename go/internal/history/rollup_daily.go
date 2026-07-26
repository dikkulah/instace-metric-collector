package history

import (
	"context"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

const dailyRollupWatermarkKey = "daily_rollup_watermark"

const dailyRollupSchema = `
CREATE TABLE IF NOT EXISTS daily_rollup (
  agent_id TEXT NOT NULL,
  day_start TEXT NOT NULL,
  sample_count INTEGER NOT NULL,
  cpu_avg REAL NOT NULL,
  cpu_max REAL NOT NULL,
  memory_used_avg REAL NOT NULL,
  memory_total_avg REAL NOT NULL,
  PRIMARY KEY (agent_id, day_start)
);
CREATE INDEX IF NOT EXISTS idx_daily_rollup_agent_time ON daily_rollup(agent_id, day_start);
`

func (s *Store) ensureDailyRollupSchema() error {
	if s == nil || s.db == nil {
		return nil
	}
	_, err := s.db.Exec(dailyRollupSchema)
	return err
}

// RunDailyRollup aggregates completed days from hourly_rollup into daily_rollup.
func (s *Store) RunDailyRollup(ctx context.Context) error {
	if s == nil || s.profile == "minimal" {
		return nil
	}
	if err := s.ensureRollupSchema(); err != nil {
		return err
	}
	if err := s.ensureDailyRollupSchema(); err != nil {
		return err
	}

	end := time.Now().UTC().Truncate(24 * time.Hour)
	start, err := s.dailyRollupWatermark(end)
	if err != nil {
		return err
	}

	for day := start; day.Before(end); day = day.Add(24 * time.Hour) {
		if err := s.rollupDay(ctx, day); err != nil {
			return err
		}
	}
	return s.saveDailyRollupWatermark(end)
}

func (s *Store) dailyRollupWatermark(end time.Time) (time.Time, error) {
	var wm string
	ok, err := s.GetSetting(dailyRollupWatermarkKey, &wm)
	if err != nil {
		return time.Time{}, err
	}
	if ok && wm != "" {
		t, err := time.Parse(time.RFC3339, wm)
		if err == nil {
			return t.UTC().Truncate(24 * time.Hour), nil
		}
	}
	defaultStart := end.Add(-7 * 24 * time.Hour)
	var earliest string
	err = s.db.QueryRowContext(context.Background(),
		`SELECT MIN(hour_start) FROM hourly_rollup`).Scan(&earliest)
	if err != nil || earliest == "" {
		return defaultStart, nil
	}
	t, err := time.Parse(time.RFC3339, earliest)
	if err != nil {
		t, err = time.Parse(time.RFC3339Nano, earliest)
	}
	if err != nil {
		return defaultStart, nil
	}
	t = t.UTC().Truncate(24 * time.Hour)
	if t.After(defaultStart) {
		return t, nil
	}
	return defaultStart, nil
}

func (s *Store) saveDailyRollupWatermark(t time.Time) error {
	return s.SaveSetting(dailyRollupWatermarkKey, t.UTC().Format(time.RFC3339))
}

func (s *Store) rollupDay(ctx context.Context, day time.Time) error {
	from := day.UTC().Format(time.RFC3339)
	to := day.Add(24 * time.Hour).UTC().Format(time.RFC3339)
	dayKey := day.UTC().Format(time.RFC3339)

	rows, err := s.db.QueryContext(ctx, `
		SELECT agent_id,
		       SUM(sample_count) AS sample_count,
		       AVG(cpu_avg) AS cpu_avg,
		       MAX(cpu_max) AS cpu_max,
		       AVG(memory_used_avg) AS memory_used_avg,
		       AVG(memory_total_avg) AS memory_total_avg
		FROM hourly_rollup
		WHERE hour_start >= ? AND hour_start < ?
		GROUP BY agent_id`,
		from, to,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	type rollupRow struct {
		agentID   string
		sampleCnt int
		cpuAvg    float64
		cpuMax    float64
		memUsed   float64
		memTotal  float64
	}
	var batch []rollupRow
	for rows.Next() {
		var row rollupRow
		if err := rows.Scan(&row.agentID, &row.sampleCnt, &row.cpuAvg, &row.cpuMax, &row.memUsed, &row.memTotal); err != nil {
			return err
		}
		batch = append(batch, row)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, row := range batch {
		_, err := s.db.ExecContext(ctx, `
			INSERT OR REPLACE INTO daily_rollup
			(agent_id, day_start, sample_count, cpu_avg, cpu_max, memory_used_avg, memory_total_avg)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			row.agentID, dayKey, row.sampleCnt, row.cpuAvg, row.cpuMax, row.memUsed, row.memTotal,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// QueryDailyRollup returns downsampled snapshots from daily_rollup.
func (s *Store) QueryDailyRollup(agentID, from, to string, limit int) ([]payload.Snapshot, error) {
	if s == nil {
		return nil, nil
	}
	if err := s.ensureDailyRollupSchema(); err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 500
	}
	q := `SELECT day_start, cpu_avg, cpu_max, memory_used_avg, memory_total_avg
	      FROM daily_rollup WHERE agent_id = ?`
	args := []any{agentID}
	if from != "" {
		q += ` AND day_start >= ?`
		args = append(args, from)
	}
	if to != "" {
		q += ` AND day_start <= ?`
		args = append(args, to)
	}
	q += ` ORDER BY day_start DESC LIMIT ?`
	args = append(args, limit)

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []payload.Snapshot
	for rows.Next() {
		var dayStart string
		var cpuAvg, cpuMax, memUsed, memTotal float64
		if err := rows.Scan(&dayStart, &cpuAvg, &cpuMax, &memUsed, &memTotal); err != nil {
			return nil, err
		}
		out = append(out, payload.Snapshot{
			CollectedAt: dayStart,
			Payload:     payload.AggregateMetricsPayload(cpuAvg, int64(memUsed), int64(memTotal)),
		})
		_ = cpuMax
	}
	return out, rows.Err()
}
