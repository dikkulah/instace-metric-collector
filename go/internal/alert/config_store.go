package alert

import (
	"encoding/json"
	"sync"
	"time"
)

const settingsKey = "alert_config"

// SettingsKey returns the persistence key for alert config in hub_settings.
func SettingsKey() string { return settingsKey }

// ConfigSnapshot is the hub alert + diagnostic threshold set (API + persistence).
// Percent fields use 0–100 scale except memoryRatio which is 0–1 internally after ApplyAPI.
type ConfigSnapshot struct {
	CPUPercent              float64 `json:"cpuPercent"`
	MemoryPercent           float64 `json:"memoryPercent"`
	DiskPercent             float64 `json:"diskPercent"`
	CooldownMinutes         int     `json:"cooldownMinutes"`
	StaleMultiplier         float64 `json:"staleMultiplier"`
	CPUSpikeMinPercent      float64 `json:"cpuSpikeMinPercent"`
	MemoryPressurePercent   float64 `json:"memoryPressurePercent"`
	DiskFillingPercent      float64 `json:"diskFillingPercent"`
	ContainerRestartCount   int     `json:"containerRestartCount"`
	SustainedWindowMinutes  int     `json:"sustainedWindowMinutes"`
	OfflineAfterHours       int     `json:"offlineAfterHours"`
}

// DefaultConfigFromEnv builds initial values from startup config.
func DefaultConfigFromEnv(cpu, memoryRatio, disk, staleMult float64, cooldown time.Duration) ConfigSnapshot {
	memPct := memoryRatio * 100
	if memPct <= 0 {
		memPct = 90
	}
	cooldownMin := int(cooldown / time.Minute)
	if cooldownMin <= 0 {
		cooldownMin = 10
	}
	return ConfigSnapshot{
		CPUPercent:            cpu,
		MemoryPercent:         memPct,
		DiskPercent:           disk,
		CooldownMinutes:       cooldownMin,
		StaleMultiplier:       staleMult,
		CPUSpikeMinPercent:    50,
		MemoryPressurePercent: 85,
		DiskFillingPercent:    85,
		ContainerRestartCount: 3,
	}
}

func defaultSustainedMinutes(d time.Duration) int {
	if d <= 0 {
		return 0
	}
	m := int(d / time.Minute)
	if m <= 0 {
		m = 5
	}
	return m
}

func defaultOfflineHours(d time.Duration) int {
	if d <= 0 {
		return 24
	}
	h := int(d / time.Hour)
	if h <= 0 {
		h = 24
	}
	return h
}

// ConfigStore holds runtime-updatable thresholds (hub UI).
type ConfigStore struct {
	mu   sync.RWMutex
	snap ConfigSnapshot
}

func NewConfigStore(initial ConfigSnapshot) *ConfigStore {
	normalize(&initial)
	return &ConfigStore{snap: initial}
}

func (s *ConfigStore) Get() ConfigSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.snap
}

func (s *ConfigStore) Update(next ConfigSnapshot) ConfigSnapshot {
	normalize(&next)
	s.mu.Lock()
	s.snap = next
	s.mu.Unlock()
	return next
}

func (s *ConfigStore) Thresholds() Thresholds {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return Thresholds{
		CPUPercent:    s.snap.CPUPercent,
		MemoryPercent: s.snap.MemoryPercent / 100,
		DiskPercent:   s.snap.DiskPercent,
	}
}

func (s *ConfigStore) Cooldown() time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m := s.snap.CooldownMinutes
	if m <= 0 {
		m = 10
	}
	return time.Duration(m) * time.Minute
}

func (s *ConfigStore) StaleAfter(collectionInterval time.Duration) time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m := s.snap.StaleMultiplier
	if m <= 0 {
		m = 2
	}
	return time.Duration(float64(collectionInterval) * m)
}

// SustainedWindow returns the CPU/memory sustained alert window.
func (s *ConfigStore) SustainedWindow() time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.snap.SustainedWindowMinutes <= 0 {
		return 0
	}
	return time.Duration(s.snap.SustainedWindowMinutes) * time.Minute
}

// OfflineAfter returns how long without push before an agent is marked offline.
func (s *ConfigStore) OfflineAfter(fallback time.Duration) time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.snap.OfflineAfterHours <= 0 {
		if fallback > 0 {
			return fallback
		}
		return 24 * time.Hour
	}
	return time.Duration(s.snap.OfflineAfterHours) * time.Hour
}

func (s *ConfigStore) Diagnostics() DiagnosticThresholds {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return DiagnosticThresholds{
		CPUSpikeMinPercent:    s.snap.CPUSpikeMinPercent,
		MemoryPressurePercent: s.snap.MemoryPressurePercent,
		DiskFillingPercent:    s.snap.DiskFillingPercent,
		ContainerRestartCount: s.snap.ContainerRestartCount,
	}
}

// DiagnosticThresholds configures the diagnostic engine.
type DiagnosticThresholds struct {
	CPUSpikeMinPercent    float64
	MemoryPressurePercent float64
	DiskFillingPercent    float64
	ContainerRestartCount int
}

func (s *ConfigStore) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.Get())
}

func normalize(c *ConfigSnapshot) {
	if c.CPUPercent <= 0 || c.CPUPercent > 100 {
		c.CPUPercent = 90
	}
	if c.MemoryPercent <= 0 || c.MemoryPercent > 100 {
		c.MemoryPercent = 90
	}
	if c.DiskPercent <= 0 || c.DiskPercent > 100 {
		c.DiskPercent = 90
	}
	if c.CooldownMinutes <= 0 {
		c.CooldownMinutes = 10
	}
	if c.StaleMultiplier <= 0 {
		c.StaleMultiplier = 2
	}
	if c.CPUSpikeMinPercent <= 0 {
		c.CPUSpikeMinPercent = 50
	}
	if c.MemoryPressurePercent <= 0 {
		c.MemoryPressurePercent = 85
	}
	if c.DiskFillingPercent <= 0 {
		c.DiskFillingPercent = 85
	}
	if c.ContainerRestartCount <= 0 {
		c.ContainerRestartCount = 3
	}
	if c.SustainedWindowMinutes < 0 {
		c.SustainedWindowMinutes = 0
	}
	if c.OfflineAfterHours <= 0 {
		c.OfflineAfterHours = 24
	}
}
