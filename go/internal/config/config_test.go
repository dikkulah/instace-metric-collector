package config

import (
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("SERVER_PORT", "")
	t.Setenv("METRICS_COLLECTION_INTERVAL", "")
	t.Setenv("METRICS_UI_ENABLED", "")
	t.Setenv("DOCKER_ENABLED", "")
	t.Setenv("METRICS_HUB_ENABLED", "")
	t.Setenv("LOGGING_FILE_NAME", "")
	t.Setenv("METRICS_PUSH_ENABLED", "")
	t.Setenv("METRICS_ALERTS_WEBHOOK_URL", "")

	cfg := Load()
	if cfg.ServerPort != "8080" {
		t.Fatalf("ServerPort = %q, want 8080", cfg.ServerPort)
	}
	if cfg.MetricsCollectionPeriod != 60*time.Second {
		t.Fatalf("MetricsCollectionPeriod = %v, want 60s", cfg.MetricsCollectionPeriod)
	}
	if !cfg.MetricsUIEnabled {
		t.Fatal("MetricsUIEnabled should default true")
	}
	if !cfg.DockerEnabled {
		t.Fatal("DockerEnabled should default true")
	}
	if cfg.HubEnabled {
		t.Fatal("HubEnabled should default false")
	}
	if cfg.LoggingFileName != "metrics-collector.log" {
		t.Fatalf("LoggingFileName = %q", cfg.LoggingFileName)
	}
	if cfg.MetricsPushEnabled {
		t.Fatal("MetricsPushEnabled should default false")
	}
	if cfg.AlertsCPUThreshold != 90 {
		t.Fatalf("AlertsCPUThreshold = %v", cfg.AlertsCPUThreshold)
	}
	if cfg.AlertsCooldown != 10*time.Minute {
		t.Fatalf("AlertsCooldown = %v", cfg.AlertsCooldown)
	}
}

func TestLoadFromEnv(t *testing.T) {
	t.Setenv("SERVER_PORT", "9090")
	t.Setenv("METRICS_COLLECTION_INTERVAL", "5000")
	t.Setenv("METRICS_UI_ENABLED", "false")
	t.Setenv("DOCKER_ENABLED", "false")
	t.Setenv("METRICS_HUB_ENABLED", "true")
	t.Setenv("METRICS_PUSH_ENABLED", "true")
	t.Setenv("METRICS_PUSH_INGEST_URL", "http://hub:8080/api/v1/ingest")
	t.Setenv("METRICS_PUSH_AGENT_ID", "agent-01")
	t.Setenv("METRICS_PUSH_AUTH_TOKEN", "secret")
	t.Setenv("METRICS_HUB_INGEST_TOKEN", "hub-secret")
	t.Setenv("METRICS_ALERTS_WEBHOOK_URL", "http://hooks.example/alert")
	t.Setenv("METRICS_ALERTS_CPU_THRESHOLD", "0.85")

	cfg := Load()
	if cfg.ServerPort != "9090" {
		t.Fatalf("ServerPort = %q", cfg.ServerPort)
	}
	if cfg.MetricsCollectionPeriod != 5*time.Second {
		t.Fatalf("MetricsCollectionPeriod = %v", cfg.MetricsCollectionPeriod)
	}
	if cfg.MetricsUIEnabled || cfg.DockerEnabled || !cfg.HubEnabled {
		t.Fatalf("unexpected flags: ui=%v docker=%v hub=%v", cfg.MetricsUIEnabled, cfg.DockerEnabled, cfg.HubEnabled)
	}
	if !cfg.MetricsPushEnabled || cfg.MetricsPushIngestURL == "" || cfg.MetricsPushAgentID != "agent-01" {
		t.Fatalf("push config: %+v", cfg)
	}
	if cfg.HubIngestToken != "hub-secret" || cfg.AlertsWebhookURL == "" {
		t.Fatalf("hub/alert config: %+v", cfg)
	}
	if cfg.AlertsCPUThreshold != 0.85 {
		t.Fatalf("AlertsCPUThreshold = %v", cfg.AlertsCPUThreshold)
	}
}
