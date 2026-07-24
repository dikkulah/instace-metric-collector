package store

import (
	"sync"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

// SnapshotStore keeps a ring buffer of metrics snapshots with SSE listeners.
type SnapshotStore struct {
	mu        sync.RWMutex
	history   []payload.Snapshot
	capacity  int
	listeners []func(payload.Snapshot)
}

func NewSnapshotStore(capacity int) *SnapshotStore {
	if capacity < 1 {
		capacity = 60
	}
	return &SnapshotStore{capacity: capacity}
}

func (s *SnapshotStore) AddListener(fn func(payload.Snapshot)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.listeners = append(s.listeners, fn)
}

func (s *SnapshotStore) Push(snap payload.Snapshot) {
	s.mu.Lock()
	s.history = append(s.history, snap)
	if len(s.history) > s.capacity {
		s.history = s.history[len(s.history)-s.capacity:]
	}
	listeners := append([]func(payload.Snapshot){}, s.listeners...)
	s.mu.Unlock()

	for _, fn := range listeners {
		fn(snap)
	}
}

func (s *SnapshotStore) Latest() (payload.Snapshot, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.history) == 0 {
		return payload.Snapshot{}, false
	}
	return s.history[len(s.history)-1], true
}

func (s *SnapshotStore) History(limit int) []payload.Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if limit <= 0 || len(s.history) == 0 {
		return nil
	}
	start := len(s.history) - limit
	if start < 0 {
		start = 0
	}
	out := make([]payload.Snapshot, len(s.history[start:]))
	copy(out, s.history[start:])
	return out
}
