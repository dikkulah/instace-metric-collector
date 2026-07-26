package alert

import (
	"sync"
	"time"
)

const silencesSettingsKey = "alert_silences"

// SilencesKey returns the persistence key for alert silences in hub_settings.
func SilencesKey() string { return silencesSettingsKey }

// SilenceEntry mutes notifications for an agent and optional rule until Until.
// Empty RuleID silences all rules for the agent.
type SilenceEntry struct {
	AgentID   string    `json:"agentId"`
	RuleID    string    `json:"ruleId"`
	Until     time.Time `json:"until"`
	CreatedAt time.Time `json:"createdAt"`
}

// SilenceStore holds active alert silences (hub settings).
type SilenceStore struct {
	mu      sync.RWMutex
	entries []SilenceEntry
	persist SettingsPersister
}

// LoadSilenceStore initializes from persisted settings.
func LoadSilenceStore(persist SettingsPersister) *SilenceStore {
	s := &SilenceStore{persist: persist}
	if persist != nil {
		var saved []SilenceEntry
		if ok, err := persist.GetSetting(SilencesKey(), &saved); err == nil && ok {
			s.entries = saved
		}
	}
	s.prune()
	return s
}

// List returns active (non-expired) silences.
func (s *SilenceStore) List() []SilenceEntry {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneLocked(time.Now().UTC())
	out := make([]SilenceEntry, len(s.entries))
	copy(out, s.entries)
	return out
}

// Add creates or extends a silence window.
func (s *SilenceStore) Add(agentID, ruleID string, duration time.Duration) (SilenceEntry, error) {
	if s == nil {
		return SilenceEntry{}, nil
	}
	if duration <= 0 {
		duration = time.Hour
	}
	now := time.Now().UTC()
	entry := SilenceEntry{
		AgentID:   agentID,
		RuleID:    ruleID,
		Until:     now.Add(duration),
		CreatedAt: now,
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneLocked(now)
	for i, e := range s.entries {
		if e.AgentID == agentID && e.RuleID == ruleID {
			if e.Until.After(entry.Until) {
				entry.Until = e.Until
			}
			if e.CreatedAt.Before(entry.CreatedAt) {
				entry.CreatedAt = e.CreatedAt
			}
			s.entries[i] = entry
			return entry, s.persistLocked()
		}
	}
	s.entries = append(s.entries, entry)
	return entry, s.persistLocked()
}

// Revoke removes a silence for agent+rule. Returns true if an entry was removed.
func (s *SilenceStore) Revoke(agentID, ruleID string) bool {
	if s == nil {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneLocked(time.Now().UTC())
	kept := s.entries[:0]
	removed := false
	for _, e := range s.entries {
		if e.AgentID == agentID && e.RuleID == ruleID {
			removed = true
			continue
		}
		kept = append(kept, e)
	}
	if !removed {
		return false
	}
	s.entries = kept
	_ = s.persistLocked()
	return true
}

// IsSilenced reports whether notifications should be skipped for agent+rule.
func (s *SilenceStore) IsSilenced(agentID, ruleID string) bool {
	if s == nil {
		return false
	}
	now := time.Now().UTC()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneLocked(now)
	for _, e := range s.entries {
		if e.AgentID != agentID {
			continue
		}
		if e.RuleID != "" && e.RuleID != ruleID {
			continue
		}
		if e.Until.After(now) {
			return true
		}
	}
	return false
}

func (s *SilenceStore) prune() {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneLocked(time.Now().UTC())
}

func (s *SilenceStore) pruneLocked(now time.Time) {
	if len(s.entries) == 0 {
		return
	}
	kept := s.entries[:0]
	for _, e := range s.entries {
		if e.Until.After(now) {
			kept = append(kept, e)
		}
	}
	s.entries = kept
}

func (s *SilenceStore) persistLocked() error {
	if s.persist == nil {
		return nil
	}
	return s.persist.SaveSetting(SilencesKey(), s.entries)
}
