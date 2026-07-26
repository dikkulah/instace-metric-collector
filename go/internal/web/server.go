package web

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/alert"
	"github.com/dikkulah/instance-metric-collector/go/internal/appmode"
	"github.com/dikkulah/instance-metric-collector/go/internal/config"
	"github.com/dikkulah/instance-metric-collector/go/internal/diagnostic"
	"github.com/dikkulah/instance-metric-collector/go/internal/docker"
	"github.com/dikkulah/instance-metric-collector/go/internal/history"
	"github.com/dikkulah/instance-metric-collector/go/internal/hub"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
	"github.com/dikkulah/instance-metric-collector/go/internal/store"
	"github.com/dikkulah/instance-metric-collector/go/internal/webui"
)

const version = "2.0.0-go"

// Deps bundles HTTP server dependencies.
type Deps struct {
	Mode         appmode.Mode
	Config       config.Config
	MetricsStore *store.SnapshotStore
	Registry     *hub.Registry
	Containers   docker.ContainerSource
	AlertEngine   *alert.Engine
	AlertConfig        *alert.ConfigStore
	NotificationConfig *alert.NotificationConfigStore
	AlertSilences      *alert.SilenceStore
	DiagEngine    *diagnostic.Engine
	History      *history.Store
	HubStats     *hub.Stats
	Logger       *slog.Logger
}

// Server serves REST, SSE, and the embedded React SPA.
type Server struct {
	deps           Deps
	hubIngestToken string
	sse            *sseHub
}

func NewServer(deps Deps) *Server {
	s := &Server{
		deps:           deps,
		hubIngestToken: deps.Config.HubIngestToken,
		sse:            newSSEHub(),
	}
	if deps.MetricsStore != nil {
		deps.MetricsStore.AddListener(s.sse.broadcast)
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
	mux.HandleFunc("/api/v1/agents/", s.handleAgentRoutes)
	mux.HandleFunc("/api/v1/hub/config", s.handleHubConfig)
	mux.HandleFunc("/api/v1/hub/alert-config", s.handleHubAlertConfig)
	mux.HandleFunc("/api/v1/hub/notification-config", s.handleHubNotificationConfig)
	mux.HandleFunc("/api/v1/hub/stats", s.handleHubStats)
	mux.HandleFunc("/api/v1/alerts", s.handleAlertRoutes)
	mux.HandleFunc("/api/v1/alerts/", s.handleAlertRoutes)

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
		"mode":    string(s.deps.Mode),
		"version": version,
	})
}

func (s *Server) handleCurrent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.MetricsStore == nil {
		http.Error(w, "no content", http.StatusNoContent)
		return
	}
	snap, ok := s.deps.MetricsStore.Latest()
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
	if s.deps.MetricsStore == nil {
		writeJSON(w, []payload.Snapshot{})
		return
	}
	writeJSON(w, s.deps.MetricsStore.History(limit))
}

func (s *Server) handleStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	s.sse.serve(w, r, s.deps.MetricsStore)
}

func (s *Server) handleMetricsConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, map[string]any{
		"defaultLocale":   "en",
		"locales":         []string{"en", "tr"},
		"refreshInterval": int(s.deps.Config.MetricsCollectionPeriod.Milliseconds()),
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
	if _, ok := s.findContainer(containerID); !ok {
		http.Error(w, "container not found", http.StatusNotFound)
		return
	}
	if base := s.deps.Containers.AgentURL(containerID); base != "" {
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
	if s.deps.MetricsStore == nil {
		http.Error(w, "no content", http.StatusNoContent)
		return
	}
	snap, ok := s.deps.MetricsStore.Latest()
	if !ok {
		http.Error(w, "no content", http.StatusNoContent)
		return
	}
	writeJSON(w, snap)
}

func (s *Server) findContainer(id string) (payload.ContainerInfo, bool) {
	if info, ok := s.deps.Containers.FindByID(id); ok {
		return info, true
	}
	if s.deps.MetricsStore == nil {
		return payload.ContainerInfo{}, false
	}
	snap, ok := s.deps.MetricsStore.Latest()
	if !ok {
		return payload.ContainerInfo{}, false
	}
	for _, c := range snap.Payload.Containers {
		if c.ID == id || strings.HasPrefix(c.ID, id) || strings.HasPrefix(id, c.ID) {
			return c, true
		}
	}
	return payload.ContainerInfo{}, false
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
	if s.deps.Registry == nil {
		http.Error(w, "hub not enabled", http.StatusServiceUnavailable)
		return
	}
	if s.hubIngestToken != "" && !ingestTokenValid(r, s.hubIngestToken) {
		if s.deps.HubStats != nil {
			s.deps.HubStats.RecordIngestError()
		}
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 4<<20))
	if err != nil {
		if s.deps.HubStats != nil {
			s.deps.HubStats.RecordIngestError()
		}
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	var req ingestBody
	if err := json.Unmarshal(body, &req); err != nil {
		if s.deps.HubStats != nil {
			s.deps.HubStats.RecordIngestError()
		}
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if req.AgentID == "" {
		if s.deps.HubStats != nil {
			s.deps.HubStats.RecordIngestError()
		}
		http.Error(w, "agentId required", http.StatusBadRequest)
		return
	}

	prev, hadPrev := s.deps.Registry.Latest(req.AgentID)
	s.deps.Registry.Ingest(req.AgentID, req.Hostname, req.Snapshot)
	if s.deps.HubStats != nil {
		s.deps.HubStats.RecordIngestOK()
	}

	if s.deps.History != nil {
		agentID := req.AgentID
		hostname := req.Hostname
		snap := req.Snapshot
		go func() {
			_ = s.deps.History.WriteSample(agentID, snap)
			_ = s.deps.History.UpsertAgent(agentID, hostname, snap)
		}()
	}

	if s.deps.AlertEngine != nil {
		s.deps.AlertEngine.OnIngest(req.AgentID, req.Hostname, req.Snapshot)
	}

	if s.deps.DiagEngine != nil {
		var prevPtr *payload.Snapshot
		if hadPrev {
			prevPtr = &prev
		}
		_ = s.deps.DiagEngine.Evaluate(req.AgentID, req.Snapshot, prevPtr)
	}

	w.WriteHeader(http.StatusAccepted)
}

func ingestTokenValid(r *http.Request, expected string) bool {
	auth := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		return strings.TrimSpace(auth[7:]) == expected
	}
	return r.Header.Get("X-Ingest-Token") == expected
}

func (s *Server) handleAgentsList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.Registry == nil {
		writeJSON(w, []hub.AgentSummary{})
		return
	}
	writeJSON(w, s.listAgentsWithStatus())
}

func (s *Server) handleAgentRoutes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.Registry == nil {
		http.NotFound(w, r)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/agents/")
	parts := strings.Split(path, "/")
	agentID := parts[0]
	if agentID == "" || len(parts) < 2 {
		http.NotFound(w, r)
		return
	}
	switch parts[1] {
	case "current":
		snap, ok := s.deps.Registry.Latest(agentID)
		if !ok && s.deps.History != nil {
			var err error
			snap, ok, err = s.deps.History.LatestSample(agentID)
			if err != nil {
				http.Error(w, "current error", http.StatusInternalServerError)
				return
			}
		}
		if !ok {
			http.Error(w, "no content", http.StatusNoContent)
			return
		}
		if summary, found := s.agentSummaryByID(agentID); found && summary.Status != "" {
			w.Header().Set("X-Agent-Status", summary.Status)
		}
		writeJSON(w, snap)
	case "history":
		from := r.URL.Query().Get("from")
		to := r.URL.Query().Get("to")
		resolution := r.URL.Query().Get("resolution")
		limit := queryInt(r, "limit", 60)
		if s.deps.History != nil && (from != "" || to != "" || resolution != "") {
			samples, err := s.deps.History.QuerySamplesWithResolution(agentID, from, to, resolution, limit)
			if err != nil {
				http.Error(w, "history error", http.StatusInternalServerError)
				return
			}
			writeJSON(w, samples)
			return
		}
		writeJSON(w, s.deps.Registry.History(agentID, limit))
	case "diagnostics":
		if s.deps.History == nil {
			writeJSON(w, []history.Insight{})
			return
		}
		insights, err := s.deps.History.ListInsights(agentID, queryInt(r, "limit", 50))
		if err != nil {
			http.Error(w, "diagnostics error", http.StatusInternalServerError)
			return
		}
		writeJSON(w, insights)
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) handleHubConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	staleAfterMs := int(s.agentStaleAfter().Milliseconds())
	offlineAfterMs := int(s.agentOfflineAfter().Milliseconds())
	sustainedMs := int(s.deps.Config.AlertsSustainedWindow.Milliseconds())
	if s.deps.AlertConfig != nil {
		sustainedMs = int(s.deps.AlertConfig.SustainedWindow().Milliseconds())
	}
	writeJSON(w, map[string]any{
		"historySize":          120,
		"version":              version,
		"collectionIntervalMs": int(s.deps.Config.MetricsCollectionPeriod.Milliseconds()),
		"staleAfterMs":         staleAfterMs,
		"offlineAfterMs":       offlineAfterMs,
		"sustainedAfterMs":     sustainedMs,
		"history": map[string]any{
			"enabled":       s.deps.History != nil,
			"profile":       s.deps.Config.HistoryProfile,
			"retentionDays": s.deps.Config.HistoryRetentionDays,
			"dbPath":        s.deps.Config.HistoryDBPath,
		},
	})
}

func (s *Server) handleHubAlertConfig(w http.ResponseWriter, r *http.Request) {
	if s.deps.AlertConfig == nil {
		http.NotFound(w, r)
		return
	}
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, s.deps.AlertConfig.Get())
	case http.MethodPut:
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			http.Error(w, "read body", http.StatusBadRequest)
			return
		}
		var req alert.ConfigSnapshot
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		updated := s.deps.AlertConfig.Update(req)
		if s.deps.AlertEngine != nil {
			s.deps.AlertEngine.SetSustainedWindow(s.deps.AlertConfig.SustainedWindow())
		}
		if s.deps.History != nil {
			if err := s.deps.AlertConfig.Persist(s.deps.History); err != nil && s.deps.Logger != nil {
				s.deps.Logger.Warn("alert config persist failed", "err", err)
			}
		}
		writeJSON(w, updated)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleHubStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.Registry == nil {
		http.NotFound(w, r)
		return
	}
	agentCount := len(s.deps.Registry.ListAgents())
	snap := s.deps.HubStats.Snapshot(agentCount)
	if s.deps.AlertEngine != nil {
		snap.AlertQueueDepth = len(s.deps.AlertEngine.Pending())
	}
	writeJSON(w, snap)
}

func (s *Server) handleAlertRoutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/alerts")
	path = strings.Trim(path, "/")
	if path == "" {
		s.handleAlertsList(w, r)
		return
	}
	parts := strings.Split(path, "/")
	if len(parts) == 1 && parts[0] == "silence" {
		s.handleAlertSilence(w, r)
		return
	}
	if len(parts) == 1 && parts[0] == "silences" {
		if r.Method == http.MethodDelete {
			s.handleAlertSilenceRevoke(w, r)
			return
		}
		s.handleAlertSilencesList(w, r)
		return
	}
	if len(parts) == 2 && parts[1] == "ack" {
		s.handleAlertAck(w, r, parts[0])
		return
	}
	if len(parts) == 2 && parts[1] == "resolve" {
		s.handleAlertResolve(w, r, parts[0])
		return
	}
	http.NotFound(w, r)
}

func (s *Server) handleAlertsList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.History == nil {
		writeJSON(w, []history.AlertRecord{})
		return
	}
	agentID := r.URL.Query().Get("agentId")
	status := r.URL.Query().Get("status")
	severity := r.URL.Query().Get("severity")
	limit := queryInt(r, "limit", 100)
	records, err := s.deps.History.ListAlerts(agentID, status, severity, limit)
	if err != nil {
		http.Error(w, "alerts error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, records)
}

func (s *Server) handleAlertAck(w http.ResponseWriter, r *http.Request, alertID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.History == nil {
		http.Error(w, "history unavailable", http.StatusServiceUnavailable)
		return
	}
	record, err := s.deps.History.AcknowledgeAlert(alertID)
	if errors.Is(err, history.ErrAlertNotFound) {
		http.Error(w, "alert not found", http.StatusNotFound)
		return
	}
	if errors.Is(err, history.ErrAlertNotAckable) {
		http.Error(w, "alert cannot be acknowledged", http.StatusConflict)
		return
	}
	if err != nil {
		http.Error(w, "ack error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, record)
}

func (s *Server) handleAlertResolve(w http.ResponseWriter, r *http.Request, alertID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.History == nil {
		http.Error(w, "history unavailable", http.StatusServiceUnavailable)
		return
	}
	record, err := s.deps.History.ResolveAlert(alertID)
	if errors.Is(err, history.ErrAlertNotFound) {
		http.Error(w, "alert not found", http.StatusNotFound)
		return
	}
	if errors.Is(err, history.ErrAlertNotResolvable) {
		http.Error(w, "alert cannot be resolved", http.StatusConflict)
		return
	}
	if err != nil {
		http.Error(w, "resolve error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, record)
}

type alertSilenceRequest struct {
	AgentID         string `json:"agentId"`
	RuleID          string `json:"ruleId"`
	DurationMinutes int    `json:"durationMinutes"`
}

func (s *Server) handleAlertSilence(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.AlertSilences == nil {
		http.Error(w, "silence unavailable", http.StatusServiceUnavailable)
		return
	}
	var req alertSilenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.AgentID) == "" {
		http.Error(w, "agentId required", http.StatusBadRequest)
		return
	}
	duration := time.Duration(req.DurationMinutes) * time.Minute
	if duration <= 0 {
		duration = time.Hour
	}
	entry, err := s.deps.AlertSilences.Add(req.AgentID, req.RuleID, duration)
	if err != nil {
		http.Error(w, "silence error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, entry)
}

func (s *Server) handleAlertSilencesList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.AlertSilences == nil {
		writeJSON(w, []alert.SilenceEntry{})
		return
	}
	writeJSON(w, s.deps.AlertSilences.List())
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
