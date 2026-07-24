package web

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/config"
	"github.com/dikkulah/instance-metric-collector/go/internal/docker"
	"github.com/dikkulah/instance-metric-collector/go/internal/hub"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
	"github.com/dikkulah/instance-metric-collector/go/internal/appmode"
	"github.com/dikkulah/instance-metric-collector/go/internal/store"
	"github.com/dikkulah/instance-metric-collector/go/internal/webui"
)

const version = "2.0.0-go"

// Server serves REST, SSE, and the embedded React SPA.
type Server struct {
	mode     appmode.Mode
	cfg      config.Config
	store      *store.SnapshotStore
	registry   *hub.Registry
	containers docker.ContainerSource
	logger     *slog.Logger
	sse      *sseHub
}

func NewServer(mode appmode.Mode, cfg config.Config, metricsStore *store.SnapshotStore, registry *hub.Registry, containers docker.ContainerSource, logger *slog.Logger) *Server {
	s := &Server{
		mode:       mode,
		cfg:        cfg,
		store:      metricsStore,
		registry:   registry,
		containers: containers,
		logger:     logger,
		sse:        newSSEHub(),
	}
	if metricsStore != nil {
		metricsStore.AddListener(s.sse.broadcast)
	}
	return s
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/meta", s.handleMeta)
	mux.HandleFunc("/api/metrics/current", s.handleCurrent)
	mux.HandleFunc("/api/metrics/history", s.handleHistory)
	mux.HandleFunc("/api/metrics/stream", s.handleStream)
	mux.HandleFunc("/api/metrics/config", s.handleMetricsConfig)
	mux.HandleFunc("/api/containers/", s.handleContainerMetrics)
	mux.HandleFunc("/api/v1/ingest", s.handleIngest)
	mux.HandleFunc("/api/v1/agents", s.handleAgentsList)
	mux.HandleFunc("/api/v1/agents/", s.handleAgentByID)
	mux.HandleFunc("/api/v1/hub/config", s.handleHubConfig)

	static := webui.Handler()
	mux.Handle("/", spaHandler(static))

	return mux
}

func (s *Server) handleMeta(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, map[string]any{
		"mode":    string(s.mode),
		"version": version,
	})
}

func (s *Server) handleCurrent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.store == nil {
		http.Error(w, "no content", http.StatusNoContent)
		return
	}
	snap, ok := s.store.Latest()
	if !ok {
		http.Error(w, "no content", http.StatusNoContent)
		return
	}
	writeJSON(w, snap)
}

func (s *Server) handleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	limit := queryInt(r, "limit", 60)
	if s.store == nil {
		writeJSON(w, []payload.Snapshot{})
		return
	}
	writeJSON(w, s.store.History(limit))
}

func (s *Server) handleStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	s.sse.serve(w, r, s.store)
}

func (s *Server) handleMetricsConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, map[string]any{
		"defaultLocale":   "en",
		"locales":         []string{"en", "tr"},
		"refreshInterval": int(s.cfg.MetricsCollectionPeriod.Milliseconds()),
		"historySize":     120,
	})
}

func (s *Server) handleContainerMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/containers/")
	parts := strings.Split(path, "/")
	if len(parts) < 3 || parts[1] != "metrics" || parts[2] != "current" {
		http.NotFound(w, r)
		return
	}
	containerID := parts[0]
	if _, ok := s.containers.FindByID(containerID); !ok {
		http.Error(w, "container not found", http.StatusNotFound)
		return
	}
	if base := s.containers.AgentURL(containerID); base != "" {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/api/metrics/current", nil)
		if err == nil {
			resp, err := http.DefaultClient.Do(req)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == http.StatusOK {
					w.Header().Set("Content-Type", "application/json")
					_, _ = io.Copy(w, resp.Body)
					return
				}
			}
		}
	}
	if s.store == nil {
		http.Error(w, "no content", http.StatusNoContent)
		return
	}
	snap, ok := s.store.Latest()
	if !ok {
		http.Error(w, "no content", http.StatusNoContent)
		return
	}
	writeJSON(w, snap)
}

type ingestBody struct {
	AgentID  string           `json:"agentId"`
	Hostname string           `json:"hostname"`
	Snapshot payload.Snapshot `json:"snapshot"`
}

func (s *Server) handleIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.registry == nil {
		http.Error(w, "hub not enabled", http.StatusServiceUnavailable)
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 4<<20))
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	var req ingestBody
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if req.AgentID == "" {
		http.Error(w, "agentId required", http.StatusBadRequest)
		return
	}
	s.registry.Ingest(req.AgentID, req.Hostname, req.Snapshot)
	w.WriteHeader(http.StatusAccepted)
}

func (s *Server) handleAgentsList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.registry == nil {
		writeJSON(w, []hub.AgentSummary{})
		return
	}
	writeJSON(w, s.registry.ListAgents())
}

func (s *Server) handleAgentByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.registry == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/agents/")
	parts := strings.Split(path, "/")
	agentID := parts[0]
	if agentID == "" {
		http.NotFound(w, r)
		return
	}
	if len(parts) == 1 {
		http.NotFound(w, r)
		return
	}
	switch parts[1] {
	case "current":
		snap, ok := s.registry.Latest(agentID)
		if !ok {
			http.Error(w, "no content", http.StatusNoContent)
			return
		}
		writeJSON(w, snap)
	case "history":
		limit := queryInt(r, "limit", 60)
		writeJSON(w, s.registry.History(agentID, limit))
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) handleHubConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, map[string]any{
		"historySize": 120,
		"version":     version,
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

func queryInt(r *http.Request, key string, fallback int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

// spaHandler serves static files and falls back to index.html for client routes.
func spaHandler(static http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		if r.URL.Path != "/" && !strings.Contains(strings.TrimPrefix(r.URL.Path, "/"), ".") {
			r2 := r.Clone(r.Context())
			r2.URL.Path = "/"
			static.ServeHTTP(w, r2)
			return
		}
		static.ServeHTTP(w, r)
	})
}

type sseHub struct {
	mu      sync.Mutex
	clients map[chan []byte]struct{}
}

func newSSEHub() *sseHub {
	return &sseHub{clients: make(map[chan []byte]struct{})}
}

func (h *sseHub) serve(w http.ResponseWriter, r *http.Request, metricsStore *store.SnapshotStore) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ch := make(chan []byte, 4)
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		delete(h.clients, ch)
		h.mu.Unlock()
		close(ch)
	}()

	if metricsStore != nil {
		if snap, ok := metricsStore.Latest(); ok {
			if b, err := json.Marshal(snap); err == nil {
				_, _ = w.Write([]byte("event: metrics\ndata: "))
				_, _ = w.Write(b)
				_, _ = w.Write([]byte("\n\n"))
				flusher.Flush()
			}
		}
	}

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case data, ok := <-ch:
			if !ok {
				return
			}
			_, _ = w.Write([]byte("event: metrics\ndata: "))
			_, _ = w.Write(data)
			_, _ = w.Write([]byte("\n\n"))
			flusher.Flush()
		}
	}
}

func (h *sseHub) broadcast(snap payload.Snapshot) {
	data, err := json.Marshal(snap)
	if err != nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.clients {
		select {
		case ch <- data:
		default:
		}
	}
}
