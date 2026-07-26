package push

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func testSnapshot() payload.Snapshot {
	return payload.Snapshot{
		CollectedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Payload: payload.MetricsPayload{
			CPULoad:     0.42,
			UsedMemory:  1024,
			TotalMemory: 4096,
		},
	}
}

func TestClientSendSuccess(t *testing.T) {
	var received envelope
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret" {
			t.Fatalf("auth header = %q", r.Header.Get("Authorization"))
		}
		if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
			t.Fatal(err)
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer srv.Close()

	c := NewClient(Options{
		IngestURL:  srv.URL,
		AgentID:    "agent-01",
		Hostname:   "host-01",
		AuthToken:  "secret",
		MaxRetries: 1,
	}, nil, testLogger())

	snap := testSnapshot()
	if err := c.send(context.Background(), snap); err != nil {
		t.Fatalf("send: %v", err)
	}
	if received.AgentID != "agent-01" || received.Hostname != "host-01" {
		t.Fatalf("unexpected envelope: %+v", received)
	}
	if received.Snapshot.CollectedAt != snap.CollectedAt {
		t.Fatalf("snapshot mismatch")
	}
}

func TestClientPermanentErrorNoRetry(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	c := NewClient(Options{
		IngestURL:  srv.URL,
		AgentID:    "agent-01",
		MaxRetries: 3,
	}, nil, testLogger())

	if err := c.sendBatch(context.Background(), testSnapshot()); err == nil {
		t.Fatal("expected permanent failure")
	}
	if calls.Load() != 1 {
		t.Fatalf("calls = %d, want 1 (no retry on 4xx)", calls.Load())
	}
}

func TestClientRetriesOn5xx(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := calls.Add(1)
		if n < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer srv.Close()

	c := NewClient(Options{
		IngestURL:  srv.URL,
		AgentID:    "agent-01",
		MaxRetries: 3,
	}, nil, testLogger())

	if err := c.sendBatch(context.Background(), testSnapshot()); err != nil {
		t.Fatalf("expected success after retries: %v", err)
	}
	if calls.Load() != 3 {
		t.Fatalf("calls = %d, want 3", calls.Load())
	}
}

func TestEnqueueOverflowSpillsToSpool(t *testing.T) {
	dir := t.TempDir()
	spool, err := OpenSpool(filepath.Join(dir, "spool.db"), 10)
	if err != nil {
		t.Fatal(err)
	}
	defer spool.Close()

	c := NewClient(Options{
		IngestURL: "http://example.invalid",
		QueueSize: 2,
	}, spool, testLogger())

	s1 := payload.Snapshot{CollectedAt: "t1"}
	s2 := payload.Snapshot{CollectedAt: "t2"}
	s3 := payload.Snapshot{CollectedAt: "t3"}

	c.Enqueue(s1)
	c.Enqueue(s2)
	c.Enqueue(s3)

	if len(c.queue) != 2 {
		t.Fatalf("queue len = %d, want 2", len(c.queue))
	}
	first := <-c.queue
	second := <-c.queue
	if first.CollectedAt != "t2" || second.CollectedAt != "t3" {
		t.Fatalf("overflow failed: got %q then %q", first.CollectedAt, second.CollectedAt)
	}
	n, err := spool.Len()
	if err != nil || n != 1 {
		t.Fatalf("spool len = %d err=%v, want 1 (t1 spooled)", n, err)
	}
	_, env, ok, err := spool.Peek()
	if err != nil || !ok || env.Snapshot.CollectedAt != "t1" {
		t.Fatalf("spooled snapshot = %+v ok=%v err=%v", env, ok, err)
	}
}

func TestHubDownKeepsSnapshotInQueueNotSpool(t *testing.T) {
	dir := t.TempDir()
	spool, err := OpenSpool(filepath.Join(dir, "spool.db"), 10)
	if err != nil {
		t.Fatal(err)
	}
	defer spool.Close()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	c := NewClient(Options{
		IngestURL:    srv.URL,
		AgentID:      "agent-01",
		MaxRetries:   1,
		QueueSize:    8,
		HubRetryTick: 50 * time.Millisecond,
	}, spool, testLogger())

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go c.Run(ctx)

	c.Enqueue(payload.Snapshot{CollectedAt: "t1"})
	time.Sleep(120 * time.Millisecond)

	n, err := spool.Len()
	if err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("hub down should keep data in queue, spool len = %d", n)
	}
	if len(c.queue) != 0 {
		t.Fatalf("expected worker to hold queue item, queue len = %d", len(c.queue))
	}
}

func TestSpoolDrainOnRecovery(t *testing.T) {
	dir := t.TempDir()
	spool, err := OpenSpool(filepath.Join(dir, "spool.db"), 10)
	if err != nil {
		t.Fatal(err)
	}
	defer spool.Close()

	env := envelope{
		AgentID:  "agent-01",
		Hostname: "host",
		Snapshot: payload.Snapshot{CollectedAt: "overflow"},
	}
	if err := spool.Put(env); err != nil {
		t.Fatal(err)
	}

	var up atomic.Bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !up.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer srv.Close()

	c := NewClient(Options{
		IngestURL:    srv.URL,
		AgentID:      "agent-01",
		MaxRetries:   1,
		HubRetryTick: 25 * time.Millisecond,
	}, spool, testLogger())

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go c.Run(ctx)

	up.Store(true)
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		n, err := spool.Len()
		if err != nil {
			t.Fatal(err)
		}
		if n == 0 {
			return
		}
		time.Sleep(30 * time.Millisecond)
	}
	t.Fatal("spool overflow not drained after hub recovery")
}

func TestBackoffCapped(t *testing.T) {
	d := backoff(10)
	if d < 30*time.Second || d > 30*time.Second+500*time.Millisecond {
		t.Fatalf("backoff(10) = %v, want ~30s + jitter", d)
	}
}
