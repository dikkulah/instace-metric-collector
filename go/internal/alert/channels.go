package alert

import (
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/config"
)

// ComposeNotifiers builds fan-out delivery from env-configured channels.
func ComposeNotifiers(cfg config.Config) Notifier {
	const timeout = 5 * time.Second
	var channels []Notifier
	if cfg.AlertsWebhookURL != "" {
		channels = append(channels, NewWebhookNotifier(cfg.AlertsWebhookURL, timeout))
	}
	if cfg.AlertsSlackWebhookURL != "" {
		channels = append(channels, NewSlackNotifier(cfg.AlertsSlackWebhookURL, timeout))
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
func AlertsEnabled(cfg config.Config) bool {
	return cfg.AlertsWebhookURL != "" || cfg.AlertsSlackWebhookURL != ""
}
