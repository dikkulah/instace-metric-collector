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
}

func TestLoadFromEnv(t *testing.T) {
	t.Setenv("SERVER_PORT", "9090")
	t.Setenv("METRICS_COLLECTION_INTERVAL", "5000")
	t.Setenv("METRICS_UI_ENABLED", "false")
	t.Setenv("DOCKER_ENABLED", "false")
	t.Setenv("METRICS_HUB_ENABLED", "true")

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
}
