package web

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/dikkulah/instance-metric-collector/go/internal/alert"
)

func (s *Server) handleHubNotificationConfig(w http.ResponseWriter, r *http.Request) {
	if s.deps.NotificationConfig == nil {
		http.NotFound(w, r)
		return
	}
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, alert.BuildNotificationResponse(s.deps.Config, s.deps.NotificationConfig))
	case http.MethodPut:
		if s.deps.Config.AlertsSMTPHost != "" {
			http.Error(w, "smtp locked by env", http.StatusConflict)
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			http.Error(w, "read body", http.StatusBadRequest)
			return
		}
		var req alert.NotificationConfigSnapshot
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		updated := s.deps.NotificationConfig.Update(req)
		if s.deps.History != nil {
			if err := s.deps.NotificationConfig.Persist(s.deps.History); err != nil && s.deps.Logger != nil {
				s.deps.Logger.Warn("notification config persist failed", "err", err)
			}
		}
		s.reloadAlertNotifier()
		writeJSON(w, alert.BuildNotificationResponse(s.deps.Config, s.deps.NotificationConfig))
		_ = updated
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) reloadAlertNotifier() {
	if s.deps.AlertEngine == nil {
		return
	}
	var onSent func(alert.Event)
	if s.deps.History != nil {
		onSent = func(ev alert.Event) {
			_ = s.deps.History.SaveAlertEvent(ev, "OPEN")
		}
	}
	notifier := alert.BuildNotifierChain(s.deps.Config, s.deps.NotificationConfig, onSent)
	s.deps.AlertEngine.SetNotifier(notifier)
}

func (s *Server) handleAlertSilenceRevoke(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.deps.AlertSilences == nil {
		http.Error(w, "silence unavailable", http.StatusServiceUnavailable)
		return
	}
	agentID := strings.TrimSpace(r.URL.Query().Get("agentId"))
	ruleID := strings.TrimSpace(r.URL.Query().Get("ruleId"))
	if agentID == "" {
		http.Error(w, "agentId required", http.StatusBadRequest)
		return
	}
	if !s.deps.AlertSilences.Revoke(agentID, ruleID) {
		http.Error(w, "silence not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
