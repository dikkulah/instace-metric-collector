package alert

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestSlackNotifierPostsText(t *testing.T) {
	var body string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	n := NewSlackNotifier(srv.URL, time.Second)
	err := n.Notify(context.Background(), Event{
		AgentID:   "a1",
		AlertType: AlertTypeCPUHigh,
		Severity:  SeverityWarning,
		Message:   "CPU high",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(body, "CPU high") || !strings.Contains(body, "a1") {
		t.Fatalf("body = %q", body)
	}
}

func TestFanoutNotifierPartialSuccess(t *testing.T) {
	ok := &recordingNotifier{}
	fail := &recordingNotifier{fail: true}
	fan := NewFanoutNotifier(fail, ok)
	err := fan.Notify(context.Background(), Event{AgentID: "a1", Message: "x"})
	if err != nil {
		t.Fatalf("expected success when one channel ok: %v", err)
	}
	if len(ok.snapshot()) != 1 {
		t.Fatalf("events = %d", len(ok.snapshot()))
	}
}

func TestFanoutNotifierAllFail(t *testing.T) {
	fail := &recordingNotifier{fail: true}
	fan := NewFanoutNotifier(fail, fail)
	err := fan.Notify(context.Background(), Event{AgentID: "a1"})
	if err == nil {
		t.Fatal("expected error when all channels fail")
	}
}
