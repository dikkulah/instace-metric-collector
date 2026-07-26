package alert

import (
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/config"
)

// BuildNotifierChain composes outbound channels and optional persistence wrapper.
func BuildNotifierChain(cfg config.Config, notif *NotificationConfigStore, onSent func(Event)) Notifier {
	inner := ComposeNotifiers(cfg, notif)
	if inner == nil {
		return nil
	}
	if onSent == nil {
		return inner
	}
	return NewPersistingNotifier(inner, onSent)
}

// ComposeNotifiers builds fan-out delivery from env and hub-configured channels.
func ComposeNotifiers(cfg config.Config, notif *NotificationConfigStore) Notifier {
	const timeout = 5 * time.Second
	var channels []Notifier
	if cfg.AlertsWebhookURL != "" {
		channels = append(channels, NewWebhookNotifier(cfg.AlertsWebhookURL, timeout))
	}
	if cfg.AlertsSlackWebhookURL != "" {
		channels = append(channels, NewSlackNotifier(cfg.AlertsSlackWebhookURL, timeout))
	}
	if cfg.AlertsDiscordWebhookURL != "" {
		channels = append(channels, NewDiscordNotifier(cfg.AlertsDiscordWebhookURL, timeout))
	}
	host, port, user, password, from, to := EffectiveSMTP(cfg, notif)
	if email := NewEmailNotifier(host, port, user, password, from, to, 10*time.Second); email != nil {
		channels = append(channels, email)
	}
	if len(channels) == 0 {
		return nil
	}
	if len(channels) == 1 {
		return channels[0]
	}
	return NewFanoutNotifier(channels...)
}

// AlertsEnabled reports whether any outbound alert channel is configured.
func AlertsEnabled(cfg config.Config, notif *NotificationConfigStore) bool {
	if cfg.AlertsWebhookURL != "" || cfg.AlertsSlackWebhookURL != "" || cfg.AlertsDiscordWebhookURL != "" {
		return true
	}
	host, _, _, _, from, to := EffectiveSMTP(cfg, notif)
	return host != "" && from != "" && len(to) > 0
}
