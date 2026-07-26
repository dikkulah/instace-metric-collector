package alert

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/config"
)

func TestBuildNotificationResponseNoSecretLeak(t *testing.T) {
	cfg := config.Config{
		AlertsWebhookURL:      "https://secret.example/hook",
		AlertsSlackWebhookURL:   "https://hooks.slack.com/secret",
		AlertsDiscordWebhookURL: "https://discord.com/api/webhooks/secret",
		AlertsSMTPPassword:    "super-secret",
	}
	resp := BuildNotificationResponse(cfg, NewNotificationConfigStore(NotificationConfigSnapshot{}))
	b, err := json.Marshal(resp)
	if err != nil {
		t.Fatal(err)
	}
	body := string(b)
	if strings.Contains(body, "secret.example") || strings.Contains(body, "super-secret") {
		t.Fatalf("leaked secret in response: %s", body)
	}
	if !resp.Channels["webhook"].Enabled || resp.Channels["webhook"].Source != "env" {
		t.Fatalf("webhook = %+v", resp.Channels["webhook"])
	}
}

func TestComposeNotifiersUsesHubSMTP(t *testing.T) {
	cfg := config.Config{}
	store := NewNotificationConfigStore(NotificationConfigSnapshot{
		SMTPHost: "smtp.test",
		SMTPPort: 587,
		SMTPFrom: "hub@test.com",
		SMTPTo:   []string{"ops@test.com"},
	})
	n := ComposeNotifiers(cfg, store)
	if n == nil {
		t.Fatal("expected email notifier from hub config")
	}
}

func TestSilenceRevoke(t *testing.T) {
	store := LoadSilenceStore(nil)
	if _, err := store.Add("a1", "CPU_HIGH", time.Hour); err != nil {
		t.Fatal(err)
	}
	if !store.IsSilenced("a1", "CPU_HIGH") {
		t.Fatal("expected silence")
	}
	if !store.Revoke("a1", "CPU_HIGH") {
		t.Fatal("expected revoke ok")
	}
	if store.IsSilenced("a1", "CPU_HIGH") {
		t.Fatal("expected silence removed")
	}
}
