package push

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math/rand"
	"net/http"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

var errSendExhausted = errors.New("push retries exhausted")

// Options configures the agent-to-hub push client (METRICS_PUSH_* env).
type Options struct {
	IngestURL      string
	AgentID        string
	Hostname       string
	AuthToken      string
	Timeout        time.Duration
	MaxRetries     int
	QueueSize      int
	HubRetryTick   time.Duration
}

// envelope mirrors the hub ingestBody contract (web.handleIngest).
type envelope struct {
	AgentID  string           `json:"agentId"`
	Hostname string           `json:"hostname"`
	Snapshot payload.Snapshot `json:"snapshot"`
}

// Client pushes snapshots to the hub without ever blocking the scheduler (V11).
// Snapshots land in an in-memory queue first; disk spool is overflow only.
type Client struct {
	opts   Options
	http   *http.Client
	queue  chan payload.Snapshot
	spool  *Spool
	logger *slog.Logger
}

func NewClient(opts Options, spool *Spool, logger *slog.Logger) *Client {
	if opts.Timeout <= 0 {
		opts.Timeout = 5 * time.Second
	}
	if opts.MaxRetries <= 0 {
		opts.MaxRetries = 3
	}
	if opts.QueueSize <= 0 {
		opts.QueueSize = 32
	}
	if opts.HubRetryTick <= 0 {
		opts.HubRetryTick = 15 * time.Second
	}
	return &Client{
		opts:   opts,
		http:   &http.Client{Timeout: opts.Timeout},
		queue:  make(chan payload.Snapshot, opts.QueueSize),
		spool:  spool,
		logger: logger,
	}
}

// Enqueue adds a snapshot to the in-memory push queue. Disk spool is used only
// when the queue is full (overflow), never when the hub is temporarily down.
func (c *Client) Enqueue(snap payload.Snapshot) {
	for {
		select {
		case c.queue <- snap:
			return
		default:
			select {
			case dropped := <-c.queue:
				if c.logger != nil {
					c.logger.Warn("push queue full, spooling oldest", "collectedAt", dropped.CollectedAt)
				}
				c.spillToSpool(dropped)
			default:
			}
		}
	}
}

// Run drains the queue until ctx is cancelled. Start as a goroutine.
func (c *Client) Run(ctx context.Context) {
	c.drainSpoolUntilBlocked(ctx)

	retryTick := time.NewTicker(c.opts.HubRetryTick)
	defer retryTick.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-retryTick.C:
			c.drainSpoolUntilBlocked(ctx)
		case snap := <-c.queue:
			c.drainSpoolUntilBlocked(ctx)
			c.flushUntilSent(ctx, snap)
		}
	}
}

// drainSpoolUntilBlocked delivers overflow snapshots once the hub is reachable.
func (c *Client) drainSpoolUntilBlocked(ctx context.Context) {
	if c.spool == nil {
		return
	}
	for {
		id, env, ok, err := c.spool.Peek()
		if err != nil {
			if c.logger != nil {
				c.logger.Warn("spool peek failed", "err", err)
			}
			return
		}
		if !ok {
			return
		}
		if err := c.sendBatch(ctx, env.Snapshot); err != nil {
			return
		}
		if err := c.spool.Delete(id); err != nil && c.logger != nil {
			c.logger.Warn("spool delete failed", "id", id, "err", err)
		} else if c.logger != nil {
			c.logger.Info("spooled snapshot delivered", "id", id, "collectedAt", env.Snapshot.CollectedAt)
		}
	}
}

// flushUntilSent keeps retrying a queued snapshot until the hub accepts it.
// The item stays in the worker (memory queue path), not on disk.
func (c *Client) flushUntilSent(ctx context.Context, snap payload.Snapshot) {
	for {
		err := c.sendBatch(ctx, snap)
		if err == nil {
			return
		}
		var permanent *permanentError
		if asPermanentError(err, &permanent) {
			if c.logger != nil {
				c.logger.Error("push rejected, dropping queued snapshot", "status", permanent.status, "collectedAt", snap.CollectedAt)
			}
			return
		}
		if c.logger != nil {
			c.logger.Warn("hub unreachable, retrying queued snapshot", "collectedAt", snap.CollectedAt, "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(c.opts.HubRetryTick):
		}
	}
}

func (c *Client) spillToSpool(snap payload.Snapshot) {
	if c.spool == nil {
		if c.logger != nil {
			c.logger.Warn("push queue overflow, spool disabled — snapshot dropped", "collectedAt", snap.CollectedAt)
		}
		return
	}
	env := envelope{
		AgentID:  c.opts.AgentID,
		Hostname: c.opts.Hostname,
		Snapshot: snap,
	}
	if err := c.spool.Put(env); err != nil {
		if c.logger != nil {
			c.logger.Warn("spool put failed", "collectedAt", snap.CollectedAt, "err", err)
		}
		return
	}
	if c.logger != nil {
		c.logger.Info("queue overflow spooled", "collectedAt", snap.CollectedAt)
	}
}

func (c *Client) sendBatch(ctx context.Context, snap payload.Snapshot) error {
	var lastErr error
	for attempt := 0; attempt < c.opts.MaxRetries; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff(attempt)):
			}
		}
		err := c.send(ctx, snap)
		if err == nil {
			return nil
		}
		lastErr = err
		var permanent *permanentError
		if asPermanentError(err, &permanent) {
			return err
		}
		if c.logger != nil {
			c.logger.Warn("push failed", "agentId", c.opts.AgentID, "attempt", attempt+1, "max", c.opts.MaxRetries, "err", err)
		}
	}
	if lastErr == nil {
		lastErr = errSendExhausted
	}
	return lastErr
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
