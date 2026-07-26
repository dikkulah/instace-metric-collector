package push

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

const spoolSchema = `
CREATE TABLE IF NOT EXISTS push_spool (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collected_at TEXT NOT NULL,
  envelope_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_spool_id ON push_spool(id);
`

// Spool persists queue overflow until the hub accepts them.
type Spool struct {
	mu       sync.Mutex
	db       *sql.DB
	maxItems int
}

// OpenSpool opens (or creates) a bounded SQLite spool at path.
func OpenSpool(path string, maxItems int) (*Spool, error) {
	if maxItems <= 0 {
		maxItems = 2880
	}
	if path == "" {
		path = "push-spool.db"
	}
	if dir := filepath.Dir(path); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return nil, fmt.Errorf("spool mkdir: %w", err)
		}
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(spoolSchema); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("spool migrate: %w", err)
	}
	return &Spool{db: db, maxItems: maxItems}, nil
}

func (s *Spool) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

// Put stores an envelope at the tail of the FIFO queue.
func (s *Spool) Put(env envelope) error {
	if s == nil {
		return nil
	}
	raw, err := json.Marshal(env)
	if err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, err := s.db.Exec(
		`INSERT INTO push_spool (collected_at, envelope_json, created_at) VALUES (?, ?, ?)`,
		env.Snapshot.CollectedAt, string(raw), now,
	); err != nil {
		return err
	}
	return s.trimLocked()
}

// Peek returns the oldest spooled envelope without removing it.
func (s *Spool) Peek() (int64, envelope, bool, error) {
	if s == nil {
		return 0, envelope{}, false, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	var id int64
	var raw string
	err := s.db.QueryRow(`SELECT id, envelope_json FROM push_spool ORDER BY id ASC LIMIT 1`).Scan(&id, &raw)
	if err == sql.ErrNoRows {
		return 0, envelope{}, false, nil
	}
	if err != nil {
		return 0, envelope{}, false, err
	}
	var env envelope
	if err := json.Unmarshal([]byte(raw), &env); err != nil {
		return id, envelope{}, false, err
	}
	return id, env, true, nil
}

// Delete removes a successfully delivered spool entry.
func (s *Spool) Delete(id int64) error {
	if s == nil || id <= 0 {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM push_spool WHERE id = ?`, id)
	return err
}

// Len returns pending spool count.
func (s *Spool) Len() (int, error) {
	if s == nil {
		return 0, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	var n int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM push_spool`).Scan(&n)
	return n, err
}

func (s *Spool) trimLocked() error {
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM push_spool`).Scan(&n); err != nil {
		return err
	}
	overflow := n - s.maxItems
	if overflow <= 0 {
		return nil
	}
	_, err := s.db.Exec(`
		DELETE FROM push_spool WHERE id IN (
			SELECT id FROM push_spool ORDER BY id ASC LIMIT ?
		)`, overflow)
	return err
}
