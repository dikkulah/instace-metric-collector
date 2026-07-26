package probe

import (
	"encoding/json"
	"testing"
)

type memPersist struct {
	data map[string][]byte
}

func (m *memPersist) GetSetting(key string, dest any) (bool, error) {
	raw, ok := m.data[key]
	if !ok {
		return false, nil
	}
	return true, json.Unmarshal(raw, dest)
}

func (m *memPersist) SaveSetting(key string, value any) error {
	if m.data == nil {
		m.data = map[string][]byte{}
	}
	b, err := json.Marshal(value)
	if err != nil {
		return err
	}
	m.data[key] = b
	return nil
}

func TestConfigStoreUpdate(t *testing.T) {
	store := NewConfigStore(ConfigSnapshot{})
	updated := store.Update(ConfigSnapshot{
		Targets:   []string{"127.0.0.1:443", "https://example.com"},
		TimeoutMs: 5000,
	})
	if len(updated.Targets) != 2 || updated.TimeoutMs != 5000 {
		t.Fatalf("updated = %+v", updated)
	}
}

func TestParseTargetsCSV(t *testing.T) {
	got := ParseTargetsCSV("db:5432\nhttps://api.example.com, redis:6379")
	if len(got) != 3 {
		t.Fatalf("got = %v", got)
	}
}

func TestBuildResponseEnvLocked(t *testing.T) {
	t.Setenv("METRICS_PROBE_TARGETS", "db:5432,api:443")
	resp := BuildResponse(LoadFromEnv(), nil)
	if !resp.EnvLocked || resp.Source != "env" || len(resp.Targets) != 2 {
		t.Fatalf("resp = %+v", resp)
	}
}

func TestLoadConfigStorePersist(t *testing.T) {
	p := &memPersist{}
	p.data = map[string][]byte{
		probeSettingsKey: []byte(`{"targets":["a:1"],"timeoutMs":4000}`),
	}
	store := LoadConfigStore(p)
	snap := store.Get()
	if len(snap.Targets) != 1 || snap.Targets[0] != "a:1" {
		t.Fatalf("snap = %+v", snap)
	}
}
