package push

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
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
	}, testLogger())

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
	}, testLogger())

	c.sendWithRetry(context.Background(), testSnapshot())
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
	}, testLogger())

	c.sendWithRetry(context.Background(), testSnapshot())
	if calls.Load() != 3 {
		t.Fatalf("calls = %d, want 3", calls.Load())
	}
}

func TestEnqueueDropOldest(t *testing.T) {
	c := NewClient(Options{
		IngestURL: "http://example.invalid",
		QueueSize: 2,
	}, testLogger())

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
		t.Fatalf("drop-oldest failed: got %q then %q", first.CollectedAt, second.CollectedAt)
	}
}

func TestBackoffCapped(t *testing.T) {
	d := backoff(10)
	if d < 30*time.Second || d > 30*time.Second+500*time.Millisecond {
		t.Fatalf("backoff(10) = %v, want ~30s + jitter", d)
	}
}
