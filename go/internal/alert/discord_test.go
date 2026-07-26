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

func TestDiscordNotifierPostsContent(t *testing.T) {
	var body string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	n := NewDiscordNotifier(srv.URL, time.Second)
	err := n.Notify(context.Background(), Event{
		AgentID:   "a1",
		AlertType: AlertTypeCPUHigh,
		Severity:  SeverityWarning,
		Message:   "CPU high",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(body, `"content"`) || !strings.Contains(body, "CPU high") {
		t.Fatalf("body = %q", body)
	}
}
