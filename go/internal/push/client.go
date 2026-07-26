package push

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand"
	"net/http"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

// Options configures the agent-to-hub push client (METRICS_PUSH_* env).
type Options struct {
	IngestURL  string
	AgentID    string
	Hostname   string
	AuthToken  string
	Timeout    time.Duration
	MaxRetries int
	QueueSize  int
}

// envelope mirrors the hub ingestBody contract (web.handleIngest).
type envelope struct {
	AgentID  string           `json:"agentId"`
	Hostname string           `json:"hostname"`
	Snapshot payload.Snapshot `json:"snapshot"`
}

// Client pushes snapshots to the hub without ever blocking the scheduler (V11).
type Client struct {
	opts   Options
	http   *http.Client
	queue  chan payload.Snapshot
	logger *slog.Logger
}

func NewClient(opts Options, logger *slog.Logger) *Client {
	if opts.Timeout <= 0 {
		opts.Timeout = 5 * time.Second
	}
	if opts.MaxRetries <= 0 {
		opts.MaxRetries = 3
	}
	if opts.QueueSize <= 0 {
		opts.QueueSize = 32
	}
	return &Client{
		opts:   opts,
		http:   &http.Client{Timeout: opts.Timeout},
		queue:  make(chan payload.Snapshot, opts.QueueSize),
		logger: logger,
	}
}

// Enqueue hands a snapshot to the push worker. When the queue is full the
// oldest snapshot is dropped: fresh metrics beat stale retries.
func (c *Client) Enqueue(snap payload.Snapshot) {
	for {
		select {
		case c.queue <- snap:
			return
		default:
			select {
			case dropped := <-c.queue:
				c.logger.Warn("push queue full, dropping oldest", "collectedAt", dropped.CollectedAt)
			default:
			}
		}
	}
}

// Run drains the queue until ctx is cancelled. Start as a goroutine.
func (c *Client) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case snap := <-c.queue:
			c.sendWithRetry(ctx, snap)
		}
	}
}

func (c *Client) sendWithRetry(ctx context.Context, snap payload.Snapshot) {
	for attempt := 0; attempt < c.opts.MaxRetries; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff(attempt)):
			}
		}
		err := c.send(ctx, snap)
		if err == nil {
			return
		}
		var permanent *permanentError
		if ok := asPermanentError(err, &permanent); ok {
			c.logger.Error("push rejected, not retrying", "status", permanent.status)
			return
		}
		c.logger.Warn("push failed", "attempt", attempt+1, "max", c.opts.MaxRetries, "err", err)
	}
	c.logger.Warn("push abandoned after retries", "collectedAt", snap.CollectedAt)
}

func (c *Client) send(ctx context.Context, snap payload.Snapshot) error {
	body, err := json.Marshal(envelope{
		AgentID:  c.opts.AgentID,
		Hostname: c.opts.Hostname,
		Snapshot: snap,
	})
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.opts.IngestURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.opts.AuthToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.opts.AuthToken)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	switch {
	case resp.StatusCode < 300:
		return nil
	case resp.StatusCode >= 400 && resp.StatusCode < 500:
		return &permanentError{status: resp.StatusCode}
	default:
		return fmt.Errorf("hub returned %d", resp.StatusCode)
	}
}

type permanentError struct{ status int }

func (e *permanentError) Error() string { return fmt.Sprintf("permanent: HTTP %d", e.status) }

func asPermanentError(err error, target **permanentError) bool {
	if err == nil {
		return false
	}
	if pe, ok := err.(*permanentError); ok {
		*target = pe
		return true
	}
	return false
}

// backoff: 1s * 2^(attempt-1) + jitter, capped at 30s.
func backoff(attempt int) time.Duration {
	d := time.Second << (attempt - 1)
	if d > 30*time.Second {
		d = 30 * time.Second
	}
	return d + time.Duration(rand.Int63n(int64(500*time.Millisecond)))
}
