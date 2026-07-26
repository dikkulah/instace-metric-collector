package web

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/dikkulah/instance-metric-collector/go/internal/probe"
)

func (s *Server) handleHubProbeConfig(w http.ResponseWriter, r *http.Request) {
	if s.deps.ProbeConfig == nil {
		http.NotFound(w, r)
		return
	}
	envCfg := probe.LoadFromEnv()
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, probe.BuildResponse(envCfg, s.deps.ProbeConfig))
	case http.MethodPut:
		resp := probe.BuildResponse(envCfg, s.deps.ProbeConfig)
		if resp.EnvLocked {
			http.Error(w, "probe config locked by env", http.StatusConflict)
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			http.Error(w, "read body", http.StatusBadRequest)
			return
		}
		var req struct {
			Targets   string `json:"targetsText"`
			TimeoutMs int    `json:"timeoutMs"`
		}
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		updated := s.deps.ProbeConfig.Update(probe.ConfigSnapshot{
			Targets:   probe.ParseTargetsCSV(req.Targets),
			TimeoutMs: req.TimeoutMs,
		})
		if s.deps.History != nil {
			if err := s.deps.ProbeConfig.Persist(s.deps.History); err != nil && s.deps.Logger != nil {
				s.deps.Logger.Warn("probe config persist failed", "err", err)
			}
		}
		writeJSON(w, probe.ConfigResponse{
			Targets:   updated.Targets,
			TimeoutMs: updated.TimeoutMs,
			Source:    "hub",
			EnvLocked: false,
		})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
