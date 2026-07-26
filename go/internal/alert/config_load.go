package alert

import (
	"github.com/dikkulah/instance-metric-collector/go/internal/config"
)

// SettingsPersister loads/saves alert config JSON.
type SettingsPersister interface {
	GetSetting(key string, dest any) (bool, error)
	SaveSetting(key string, value any) error
}

// LoadConfigStore initializes from persisted settings or env defaults.
func LoadConfigStore(cfg config.Config, persist SettingsPersister) *ConfigStore {
	initial := DefaultConfigFromEnv(
		cfg.AlertsCPUThreshold,
		cfg.AlertsMemoryThreshold,
		cfg.AlertsDiskThreshold,
		cfg.AlertsStaleMultiplier,
		cfg.AlertsCooldown,
	)
	initial.SustainedWindowMinutes = defaultSustainedMinutes(cfg.AlertsSustainedWindow)
	initial.OfflineAfterHours = defaultOfflineHours(cfg.HubOfflineAfter)

	if persist != nil {
		var saved ConfigSnapshot
		if ok, err := persist.GetSetting(SettingsKey(), &saved); err == nil && ok {
			normalize(&saved)
			initial = saved
		}
	}
	store := NewConfigStore(initial)
	return store
}

// Persist saves current config to the settings store.
func (s *ConfigStore) Persist(persist SettingsPersister) error {
	if persist == nil || s == nil {
		return nil
	}
	return persist.SaveSetting(SettingsKey(), s.Get())
}
