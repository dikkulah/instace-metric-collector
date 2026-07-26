package alert

import (
	"encoding/json"
	"testing"
	"time"
)

type memSettings map[string]any

func (m memSettings) GetSetting(key string, dest any) (bool, error) {
	v, ok := m[key]
	if !ok {
		return false, nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return false, err
	}
	return true, json.Unmarshal(b, dest)
}

func (m memSettings) SaveSetting(key string, value any) error {
	m[key] = value
	return nil
}

func TestSilenceStoreAddAndMatch(t *testing.T) {
	store := LoadSilenceStore(memSettings{})
	entry, err := store.Add("a1", "CPU_HIGH", time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if !store.IsSilenced("a1", "CPU_HIGH") {
		t.Fatal("expected silenced")
	}
	if store.IsSilenced("a1", "DISK_HIGH") {
		t.Fatal("rule-specific silence should not match other rules")
	}
	if entry.AgentID != "a1" || entry.RuleID != "CPU_HIGH" {
		t.Fatalf("entry = %+v", entry)
	}
}

func TestSilenceStoreAgentWide(t *testing.T) {
	store := LoadSilenceStore(memSettings{})
	if _, err := store.Add("a1", "", 30*time.Minute); err != nil {
		t.Fatal(err)
	}
	if !store.IsSilenced("a1", "MEMORY_HIGH") {
		t.Fatal("agent-wide silence expected")
	}
}

func TestSilenceStorePersist(t *testing.T) {
	persist := memSettings{}
	store := LoadSilenceStore(persist)
	if _, err := store.Add("a1", "CPU_HIGH", time.Hour); err != nil {
		t.Fatal(err)
	}
	reloaded := LoadSilenceStore(persist)
	if !reloaded.IsSilenced("a1", "CPU_HIGH") {
		t.Fatal("expected persisted silence")
	}
}

func TestSilenceStorePruneExpired(t *testing.T) {
	store := &SilenceStore{
		entries: []SilenceEntry{{
			AgentID: "a1",
			RuleID:  "CPU_HIGH",
			Until:   time.Now().UTC().Add(-time.Minute),
		}},
	}
	store.prune()
	if store.IsSilenced("a1", "CPU_HIGH") {
		t.Fatal("expired silence should be pruned")
	}
}
