package probe

import (
	"os"
	"strings"
	"sync"
	"time"
)

const probeSettingsKey = "probe_config"

// ProbeSettingsKey returns the hub_settings persistence key.
func ProbeSettingsKey() string { return probeSettingsKey }

// ConfigSnapshot is the hub-editable probe target list (agents still read env until push config ships).
type ConfigSnapshot struct {
	Targets   []string `json:"targets"`
	TimeoutMs int      `json:"timeoutMs"`
}

// ConfigResponse is returned by GET /hub/probe-config.
type ConfigResponse struct {
	Targets   []string `json:"targets"`
	TimeoutMs int      `json:"timeoutMs"`
	Source    string   `json:"source"` // env | hub
	EnvLocked bool     `json:"envLocked"`
}

// SettingsPersister loads and saves hub_settings JSON blobs.
type SettingsPersister interface {
	GetSetting(key string, dest any) (bool, error)
	SaveSetting(key string, value any) error
}

// ConfigStore holds hub probe settings for operator reference and future agent sync.
type ConfigStore struct {
	mu   sync.RWMutex
	snap ConfigSnapshot
}

func NewConfigStore(initial ConfigSnapshot) *ConfigStore {
	normalizeSnapshot(&initial)
	return &ConfigStore{snap: initial}
}

func LoadConfigStore(persist SettingsPersister) *ConfigStore {
	snap := ConfigSnapshot{TimeoutMs: int((3 * time.Second).Milliseconds())}
	if persist != nil {
		var saved ConfigSnapshot
		if ok, err := persist.GetSetting(probeSettingsKey, &saved); err == nil && ok {
			normalizeSnapshot(&saved)
			snap = saved
		}
	}
	return NewConfigStore(snap)
}

func (s *ConfigStore) Get() ConfigSnapshot {
	if s == nil {
		return ConfigSnapshot{}
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.snap
}

func (s *ConfigStore) Update(next ConfigSnapshot) ConfigSnapshot {
	normalizeSnapshot(&next)
	if s == nil {
		return next
	}
	s.mu.Lock()
	s.snap = next
	s.mu.Unlock()
	return next
}

func (s *ConfigStore) Persist(persist SettingsPersister) error {
	if s == nil || persist == nil {
		return nil
	}
	s.mu.RLock()
	snap := s.snap
	s.mu.RUnlock()
	return persist.SaveSetting(probeSettingsKey, snap)
}

// BuildResponse merges env overrides with persisted hub settings.
func BuildResponse(env Config, store *ConfigStore) ConfigResponse {
	if envFromTargets() != nil {
		targets := capTargets(envFromTargets())
		ms := int(env.Timeout.Milliseconds())
		if ms <= 0 {
			ms = int((3 * time.Second).Milliseconds())
		}
		return ConfigResponse{
			Targets:   targets,
			TimeoutMs: ms,
			Source:    "env",
			EnvLocked: true,
		}
	}
	snap := ConfigSnapshot{TimeoutMs: int((3 * time.Second).Milliseconds())}
	if store != nil {
		snap = store.Get()
	}
	return ConfigResponse{
		Targets:   snap.Targets,
		TimeoutMs: snap.TimeoutMs,
		Source:    "hub",
		EnvLocked: false,
	}
}

func envFromTargets() []string {
	raw := strings.TrimSpace(os.Getenv("METRICS_PROBE_TARGETS"))
	if raw == "" {
		return nil
	}
	var targets []string
	for _, t := range strings.Split(raw, ",") {
		if t = strings.TrimSpace(t); t != "" {
			targets = append(targets, t)
		}
	}
	if len(targets) == 0 {
		return nil
	}
	return targets
}

func normalizeSnapshot(s *ConfigSnapshot) {
	if s == nil {
		return
	}
	var cleaned []string
	for _, t := range s.Targets {
		if t = strings.TrimSpace(t); t != "" {
			cleaned = append(cleaned, t)
		}
	}
	s.Targets = capTargets(cleaned)
	if s.TimeoutMs <= 0 {
		s.TimeoutMs = int((3 * time.Second).Milliseconds())
	}
}

// ParseTargetsCSV splits a newline or comma separated target list from the UI.
func ParseTargetsCSV(raw string) []string {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	var out []string
	for _, line := range strings.Split(raw, "\n") {
		for _, part := range strings.Split(line, ",") {
			if part = strings.TrimSpace(part); part != "" {
				out = append(out, part)
			}
		}
	}
	return capTargets(out)
}

// FormatTargetsCSV renders targets for a textarea (one per line).
func FormatTargetsCSV(targets []string) string {
	return strings.Join(targets, "\n")
}
