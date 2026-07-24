package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dikkulah/instance-metric-collector/go/internal/appmode"
	"github.com/dikkulah/instance-metric-collector/go/internal/config"
	"github.com/dikkulah/instance-metric-collector/go/internal/docker"
	"github.com/dikkulah/instance-metric-collector/go/internal/store"
)

func TestHandleMetaAgent(t *testing.T) {
	srv := NewServer(appmode.Agent, config.Config{}, store.NewSnapshotStore(10), nil, docker.NoopSource{}, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/meta", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["mode"] != "agent" {
		t.Fatalf("mode = %q", body["mode"])
	}
}

func TestHandleMetaHub(t *testing.T) {
	srv := NewServer(appmode.Hub, config.Config{}, nil, nil, docker.NoopSource{}, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/meta", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	var body map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body["mode"] != "hub" {
		t.Fatalf("mode = %q", body["mode"])
	}
}
