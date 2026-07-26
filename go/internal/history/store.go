package history

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	_ "modernc.org/sqlite"

	"github.com/dikkulah/instance-metric-collector/go/internal/alert"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

const (
	AlertStatusOpen     = "OPEN"
	AlertStatusAck      = "ACK"
	AlertStatusResolved = "RESOLVED"
)

var (
	ErrAlertNotFound      = errors.New("alert not found")
	ErrAlertNotAckable    = errors.New("alert cannot be acknowledged")
	ErrAlertNotResolvable = errors.New("alert cannot be resolved")
)

const schema = `
CREATE TABLE IF NOT EXISTS raw_samples (
  agent_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  host_os TEXT,
  host_arch TEXT,
  cpu_load REAL,
  used_memory INTEGER,
  total_memory INTEGER,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (agent_id, collected_at)
);
CREATE INDEX IF NOT EXISTS idx_raw_samples_agent_time ON raw_samples(agent_id, collected_at);

CREATE TABLE IF NOT EXISTS alert_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  fired_at TEXT NOT NULL,
  resolved_at TEXT,
  details_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alert_events_agent ON alert_events(agent_id, fired_at);

CREATE TABLE IF NOT EXISTS diagnostic_insights (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  summary_key TEXT NOT NULL,
  details_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_diagnostic_agent ON diagnostic_insights(agent_id, detected_at);

CREATE TABLE IF NOT EXISTS hub_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

// Store persists hub ingest samples and platform events.
type Store struct {
	db             *sql.DB
	retentionDays  int
	profile        string
}

func Open(path string, profile string, retentionDays int) (*Store, error) {
	if retentionDays <= 0 {
		retentionDays = 30
	}
	if profile == "" {
		profile = "full"
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(schema); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	store := &Store{db: db, retentionDays: retentionDays, profile: profile}
	_ = store.BackfillAgentCatalog()
	return store, nil
}

func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

// WriteSample persists a Tier-0 raw sample asynchronously-safe (caller may goroutine).
func (s *Store) WriteSample(agentID string, snap payload.Snapshot) error {
	if s == nil || s.profile == "minimal" {
		return nil
	}
	payloadJSON, err := json.Marshal(snap.Payload)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`
		INSERT OR REPLACE INTO raw_samples
		(agent_id, collected_at, ingested_at, schema_version, cpu_load, used_memory, total_memory, payload_json)
		VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
		agentID,
		snap.CollectedAt,
		time.Now().UTC().Format(time.RFC3339Nano),
		snap.Payload.CPULoad,
		snap.Payload.UsedMemory,
		snap.Payload.TotalMemory,
		string(payloadJSON),
	)
	return err
}

// QuerySamples returns snapshots in [from, to] up to limit.
// With a time range, samples are spread evenly across the window (not only the newest).
func (s *Store) QuerySamples(agentID, from, to string, limit int) ([]payload.Snapshot, error) {
	if s == nil {
		return nil, nil
	}
	if limit <= 0 {
		limit = 500
	}
	if from != "" || to != "" {
		return s.querySamplesInRangeDownsampled(agentID, from, to, limit)
	}
	q := `SELECT collected_at, payload_json FROM raw_samples WHERE agent_id = ?`
	args := []any{agentID}
	q += ` ORDER BY collected_at DESC LIMIT ?`
	args = append(args, limit)

	return s.scanSnapshots(q, args...)
}

func (s *Store) querySamplesInRangeDownsampled(agentID, from, to string, limit int) ([]payload.Snapshot, error) {
	const maxFetch = 20_000
	q := `SELECT collected_at, payload_json FROM raw_samples WHERE agent_id = ?`
	args := []any{agentID}
	if from != "" {
		q += ` AND collected_at >= ?`
		args = append(args, from)
	}
	if to != "" {
		q += ` AND collected_at <= ?`
		args = append(args, to)
	}
	q += ` ORDER BY collected_at ASC LIMIT ?`
	args = append(args, maxFetch)

	all, err := s.scanSnapshots(q, args...)
	if err != nil {
		return nil, err
	}
	return downsampleSnapshots(all, limit), nil
}

func downsampleSnapshots(samples []payload.Snapshot, limit int) []payload.Snapshot {
	if len(samples) == 0 || limit <= 0 {
		return samples
	}
	if len(samples) <= limit {
		return samples
	}
	if limit == 1 {
		return []payload.Snapshot{samples[len(samples)-1]}
	}
	out := make([]payload.Snapshot, limit)
	denom := limit - 1
	for i := 0; i < limit; i++ {
		idx := (i * (len(samples) - 1)) / denom
		out[i] = samples[idx]
	}
	return out
}

func (s *Store) scanSnapshots(q string, args ...any) ([]payload.Snapshot, error) {
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []payload.Snapshot
	for rows.Next() {
		var collectedAt, payloadJSON string
		if err := rows.Scan(&collectedAt, &payloadJSON); err != nil {
			return nil, err
		}
		var p payload.MetricsPayload
		if err := json.Unmarshal([]byte(payloadJSON), &p); err != nil {
			continue
		}
		out = append(out, payload.Snapshot{CollectedAt: collectedAt, Payload: p})
	}
	return out, rows.Err()
}

// SaveAlertEvent records an alert for Phase 11 history.
func (s *Store) SaveAlertEvent(ev alert.Event, status string) error {
	if s == nil {
		return nil
	}
	details, err := json.Marshal(ev.Details)
	if err != nil {
		return err
	}
	id := fmt.Sprintf("%s-%s-%d", ev.AgentID, ev.AlertType, time.Now().UnixNano())
	_, err = s.db.Exec(`
		INSERT INTO alert_events (id, agent_id, rule_id, severity, status, fired_at, details_json)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, ev.AgentID, ev.AlertType, string(ev.Severity), status, time.Now().UTC().Format(time.RFC3339Nano), string(details),
	)
	return err
}

// ListAlerts returns recent alert events with optional filters.
func (s *Store) ListAlerts(agentID, status, severity string, limit int) ([]AlertRecord, error) {
	if s == nil {
		return nil, nil
	}
	if limit <= 0 {
		limit = 100
	}
	q := `SELECT id, agent_id, rule_id, severity, status, fired_at, resolved_at, details_json FROM alert_events WHERE 1=1`
	args := []any{}
	if agentID != "" {
		q += ` AND agent_id = ?`
		args = append(args, agentID)
	}
	if status != "" {
		q += ` AND status = ?`
		args = append(args, status)
	}
	if severity != "" {
		q += ` AND severity = ?`
		args = append(args, severity)
	}
	q += ` ORDER BY fired_at DESC LIMIT ?`
	args = append(args, limit)

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AlertRecord
	for rows.Next() {
		var r AlertRecord
		var details string
		var resolvedAt sql.NullString
		if err := rows.Scan(&r.ID, &r.AgentID, &r.RuleID, &r.Severity, &r.Status, &r.FiredAt, &resolvedAt, &details); err != nil {
			return nil, err
		}
		if resolvedAt.Valid {
			r.ResolvedAt = resolvedAt.String
		}
		_ = json.Unmarshal([]byte(details), &r.Details)
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) loadAlertByID(id string) (AlertRecord, error) {
	if s == nil {
		return AlertRecord{}, ErrAlertNotFound
	}
	var r AlertRecord
	var details string
	var resolvedAt sql.NullString
	err := s.db.QueryRow(`
		SELECT id, agent_id, rule_id, severity, status, fired_at, resolved_at, details_json
		FROM alert_events WHERE id = ?`, id).Scan(
		&r.ID, &r.AgentID, &r.RuleID, &r.Severity, &r.Status, &r.FiredAt, &resolvedAt, &details,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return AlertRecord{}, ErrAlertNotFound
	}
	if err != nil {
		return AlertRecord{}, err
	}
	if resolvedAt.Valid {
		r.ResolvedAt = resolvedAt.String
	}
	_ = json.Unmarshal([]byte(details), &r.Details)
	return r, nil
}

// AcknowledgeAlert transitions an OPEN alert to ACK.
func (s *Store) AcknowledgeAlert(id string) (AlertRecord, error) {
	if s == nil {
		return AlertRecord{}, ErrAlertNotFound
	}
	r, err := s.loadAlertByID(id)
	if err != nil {
		return AlertRecord{}, err
	}
	if r.Status != AlertStatusOpen {
		return AlertRecord{}, ErrAlertNotAckable
	}
	if _, err := s.db.Exec(`UPDATE alert_events SET status = ? WHERE id = ?`, AlertStatusAck, id); err != nil {
		return AlertRecord{}, err
	}
	r.Status = AlertStatusAck
	return r, nil
}

// ResolveAlert transitions an OPEN or ACK alert to RESOLVED.
func (s *Store) ResolveAlert(id string) (AlertRecord, error) {
	if s == nil {
		return AlertRecord{}, ErrAlertNotFound
	}
	r, err := s.loadAlertByID(id)
	if err != nil {
		return AlertRecord{}, err
	}
	if r.Status != AlertStatusOpen && r.Status != AlertStatusAck {
		return AlertRecord{}, ErrAlertNotResolvable
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	if _, err := s.db.Exec(`UPDATE alert_events SET status = ?, resolved_at = ? WHERE id = ?`,
		AlertStatusResolved, now, id); err != nil {
		return AlertRecord{}, err
	}
	r.Status = AlertStatusResolved
	r.ResolvedAt = now
	return r, nil
}

// ResolveOpenAlerts marks OPEN/ACK alerts for an agent+rule as RESOLVED. Returns rows updated.
func (s *Store) ResolveOpenAlerts(agentID, ruleID string) (int, error) {
	if s == nil {
		return 0, nil
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	res, err := s.db.Exec(`
		UPDATE alert_events SET status = ?, resolved_at = ?
		WHERE agent_id = ? AND rule_id = ? AND status IN (?, ?)`,
		AlertStatusResolved, now, agentID, ruleID, AlertStatusOpen, AlertStatusAck,
	)
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

type AlertRecord struct {
	ID         string         `json:"id"`
	AgentID    string         `json:"agentId"`
	RuleID     string         `json:"ruleId"`
	Severity   string         `json:"severity"`
	Status     string         `json:"status"`
	FiredAt    string         `json:"firedAt"`
	ResolvedAt string         `json:"resolvedAt,omitempty"`
	Details    map[string]any `json:"details"`
}

// SaveInsight persists a diagnostic insight.
func (s *Store) SaveInsight(ins Insight) error {
	if s == nil {
		return nil
	}
	details, err := json.Marshal(ins.Details)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`
		INSERT OR REPLACE INTO diagnostic_insights (id, agent_id, type, severity, detected_at, summary_key, details_json)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		ins.ID, ins.AgentID, ins.Type, ins.Severity, ins.DetectedAt, ins.SummaryKey, string(details),
	)
	return err
}

func (s *Store) ListInsights(agentID string, limit int) ([]Insight, error) {
	if s == nil {
		return nil, nil
	}
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.Query(`
		SELECT id, agent_id, type, severity, detected_at, summary_key, details_json
		FROM diagnostic_insights WHERE agent_id = ? ORDER BY detected_at DESC LIMIT ?`,
		agentID, limit*3,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	seen := make(map[string]Insight)
	var order []string
	for rows.Next() {
		var ins Insight
		var details string
		if err := rows.Scan(&ins.ID, &ins.AgentID, &ins.Type, &ins.Severity, &ins.DetectedAt, &ins.SummaryKey, &details); err != nil {
			return nil, err
		}
		_ = json.Unmarshal([]byte(details), &ins.Details)
		key := InsightDedupeKey(ins)
		if _, ok := seen[key]; !ok {
			order = append(order, key)
		}
		if existing, ok := seen[key]; !ok || ins.DetectedAt > existing.DetectedAt {
			seen[key] = ins
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out := make([]Insight, 0, len(order))
	for _, key := range order {
		out = append(out, seen[key])
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

var ErrInsightNotFound = errors.New("insight not found")

// GetInsight returns a diagnostic insight by stable id for an agent.
func (s *Store) GetInsight(agentID, insightID string) (Insight, error) {
	if s == nil {
		return Insight{}, ErrInsightNotFound
	}
	var ins Insight
	var details string
	err := s.db.QueryRow(`
		SELECT id, agent_id, type, severity, detected_at, summary_key, details_json
		FROM diagnostic_insights WHERE agent_id = ? AND id = ?`, agentID, insightID).Scan(
		&ins.ID, &ins.AgentID, &ins.Type, &ins.Severity, &ins.DetectedAt, &ins.SummaryKey, &details,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Insight{}, ErrInsightNotFound
	}
	if err != nil {
		return Insight{}, err
	}
	_ = json.Unmarshal([]byte(details), &ins.Details)
	return ins, nil
}

// RunRetention rolls up completed hours then deletes expired raw samples.
func (s *Store) RunRetention(ctx context.Context) error {
	if s == nil || s.retentionDays <= 0 {
		return nil
	}
	if err := s.RunHourlyRollup(ctx); err != nil {
		return err
	}
	cutoff := time.Now().UTC().Add(-time.Duration(s.retentionDays) * 24 * time.Hour).Format(time.RFC3339Nano)
	_, err := s.db.ExecContext(ctx, `DELETE FROM raw_samples WHERE collected_at < ?`, cutoff)
	return err
}

// GetSetting loads a JSON blob by key.
func (s *Store) GetSetting(key string, dest any) (bool, error) {
	if s == nil {
		return false, nil
	}
	var raw string
	err := s.db.QueryRow(`SELECT value_json FROM hub_settings WHERE key = ?`, key).Scan(&raw)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, json.Unmarshal([]byte(raw), dest)
}

// SaveSetting persists a JSON blob by key.
func (s *Store) SaveSetting(key string, value any) error {
	if s == nil {
		return nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`
		INSERT INTO hub_settings (key, value_json, updated_at) VALUES (?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
		key, string(raw), time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}
