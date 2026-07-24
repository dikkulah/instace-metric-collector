package logoutput

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

// PayloadWriter appends one JSON MetricsPayload line per tick (Java log-first parity).
type PayloadWriter struct {
	path string
	mu   sync.Mutex
	file *os.File
}

// NewPayloadWriter opens path for append. Empty path disables file output.
func NewPayloadWriter(path string) (*PayloadWriter, error) {
	if path == "" {
		return &PayloadWriter{}, nil
	}
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return nil, fmt.Errorf("open log file %q: %w", path, err)
	}
	return &PayloadWriter{path: path, file: f}, nil
}

// Write serializes payload as a single JSON line.
func (w *PayloadWriter) Write(p payload.MetricsPayload) error {
	line, err := json.Marshal(p)
	if err != nil {
		return err
	}
	line = append(line, '\n')

	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file != nil {
		if _, err := w.file.Write(line); err != nil {
			return err
		}
	}
	return nil
}

// Close releases the log file handle.
func (w *PayloadWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file == nil {
		return nil
	}
	err := w.file.Close()
	w.file = nil
	return err
}
