package alert

import (
	"encoding/json"
	"sync"

	"github.com/dikkulah/instance-metric-collector/go/internal/config"
)

const notificationSettingsKey = "notification_config"

// NotificationSettingsKey returns the persistence key for notification config.
func NotificationSettingsKey() string { return notificationSettingsKey }

// NotificationConfigSnapshot holds non-secret SMTP fields editable from the hub UI.
type NotificationConfigSnapshot struct {
	SMTPHost string   `json:"smtpHost"`
	SMTPPort int      `json:"smtpPort"`
	SMTPUser string   `json:"smtpUser"`
	SMTPFrom string   `json:"smtpFrom"`
	SMTPTo   []string `json:"smtpTo"`
}

// ChannelStatus describes whether a notification channel is active and how it is configured.
type ChannelStatus struct {
	Enabled bool   `json:"enabled"`
	Source  string `json:"source"` // env | hub | none
}

// NotificationConfigResponse is returned by GET /hub/notification-config (no secrets).
type NotificationConfigResponse struct {
	Channels     map[string]ChannelStatus     `json:"channels"`
	SMTP         NotificationConfigSnapshot   `json:"smtp"`
	SMTPLocked   bool                         `json:"smtpLocked"`
	PasswordHint string                       `json:"passwordHint"`
}

// NotificationConfigStore holds UI-editable notification settings.
type NotificationConfigStore struct {
	mu   sync.RWMutex
	snap NotificationConfigSnapshot
}

func NewNotificationConfigStore(initial NotificationConfigSnapshot) *NotificationConfigStore {
	normalizeNotification(&initial)
	return &NotificationConfigStore{snap: initial}
}

// LoadNotificationConfigStore initializes from persisted settings.
func LoadNotificationConfigStore(persist SettingsPersister) *NotificationConfigStore {
	snap := NotificationConfigSnapshot{SMTPPort: 587}
	if persist != nil {
		var saved NotificationConfigSnapshot
		if ok, err := persist.GetSetting(NotificationSettingsKey(), &saved); err == nil && ok {
			normalizeNotification(&saved)
			snap = saved
		}
	}
	return NewNotificationConfigStore(snap)
}

func (s *NotificationConfigStore) Get() NotificationConfigSnapshot {
	if s == nil {
		return NotificationConfigSnapshot{}
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.snap
}

func (s *NotificationConfigStore) Update(next NotificationConfigSnapshot) NotificationConfigSnapshot {
	normalizeNotification(&next)
	if s == nil {
		return next
	}
	s.mu.Lock()
	s.snap = next
	s.mu.Unlock()
	return next
}

func (s *NotificationConfigStore) Persist(persist SettingsPersister) error {
	if persist == nil || s == nil {
		return nil
	}
	return persist.SaveSetting(NotificationSettingsKey(), s.Get())
}

func (s *NotificationConfigStore) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.Get())
}

func normalizeNotification(c *NotificationConfigSnapshot) {
	if c.SMTPPort <= 0 {
		c.SMTPPort = 587
	}
	if c.SMTPTo == nil {
		c.SMTPTo = []string{}
	}
}

// BuildNotificationResponse assembles API view with channel status from env + hub SMTP.
func BuildNotificationResponse(cfg config.Config, store *NotificationConfigStore) NotificationConfigResponse {
	snap := NotificationConfigSnapshot{}
	if store != nil {
		snap = store.Get()
	}
	smtpLocked := cfg.AlertsSMTPHost != ""
	if smtpLocked {
		snap = NotificationConfigSnapshot{
			SMTPHost: cfg.AlertsSMTPHost,
			SMTPPort: cfg.AlertsSMTPPort,
			SMTPUser: cfg.AlertsSMTPUser,
			SMTPFrom: cfg.AlertsSMTPFrom,
			SMTPTo:   cfg.AlertsSMTPTo,
		}
	}

	emailFromEnv := smtpLocked && cfg.AlertsSMTPFrom != "" && len(cfg.AlertsSMTPTo) > 0
	emailFromHub := !smtpLocked && snap.SMTPHost != "" && snap.SMTPFrom != "" && len(snap.SMTPTo) > 0

	resp := NotificationConfigResponse{
		SMTP:         snap,
		SMTPLocked:   smtpLocked,
		PasswordHint: "METRICS_ALERTS_SMTP_PASSWORD",
		Channels: map[string]ChannelStatus{
			"webhook": {Enabled: cfg.AlertsWebhookURL != "", Source: channelSource(cfg.AlertsWebhookURL != "", false)},
			"slack":   {Enabled: cfg.AlertsSlackWebhookURL != "", Source: channelSource(cfg.AlertsSlackWebhookURL != "", false)},
			"discord": {Enabled: cfg.AlertsDiscordWebhookURL != "", Source: channelSource(cfg.AlertsDiscordWebhookURL != "", false)},
			"email": {
				Enabled: emailFromEnv || emailFromHub,
				Source:  emailChannelSource(emailFromEnv, emailFromHub),
			},
		},
	}
	return resp
}

func channelSource(envEnabled, hubEnabled bool) string {
	switch {
	case envEnabled:
		return "env"
	case hubEnabled:
		return "hub"
	default:
		return "none"
	}
}

func emailChannelSource(fromEnv, fromHub bool) string {
	if fromEnv {
		return "env"
	}
	if fromHub {
		return "hub"
	}
	return "none"
}

// EffectiveSMTP returns SMTP settings from env or hub store for notifier construction.
func EffectiveSMTP(cfg config.Config, store *NotificationConfigStore) (host string, port int, user, password, from string, to []string) {
	if cfg.AlertsSMTPHost != "" {
		return cfg.AlertsSMTPHost, cfg.AlertsSMTPPort, cfg.AlertsSMTPUser, cfg.AlertsSMTPPassword,
			cfg.AlertsSMTPFrom, cfg.AlertsSMTPTo
	}
	if store == nil {
		return "", 0, "", "", "", nil
	}
	s := store.Get()
	return s.SMTPHost, s.SMTPPort, s.SMTPUser, cfg.AlertsSMTPPassword, s.SMTPFrom, s.SMTPTo
}
