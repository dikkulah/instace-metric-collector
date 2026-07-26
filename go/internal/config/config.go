package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds runtime settings aligned with Java application.properties / env vars.
type Config struct {
	ServerPort              string
	MetricsCollectionPeriod time.Duration
	MetricsUIEnabled        bool
	DockerEnabled           bool
	DockerCollectionPeriod  time.Duration
	DemoMode                bool
	HubEnabled              bool
	LoggingFileName         string

	// Agent push (G5) — metrics.push.* parity
	MetricsPushEnabled    bool
	MetricsPushIngestURL  string
	MetricsPushAgentID    string
	MetricsPushAuthToken  string
	MetricsPushTimeout    time.Duration
	MetricsPushMaxRetries int

	// Hub ingest auth
	HubIngestToken string

	// Hub alerts (G5) — metrics.alerts.* parity
	AlertsWebhookURL      string
	AlertsCPUThreshold    float64
	AlertsMemoryThreshold float64
	AlertsDiskThreshold   float64
	AlertsCooldown        time.Duration
	AlertsStaleMultiplier float64

	// History (G7)
	HistoryEnabled   bool
	HistoryDBPath    string
	HistoryProfile   string
	HistoryRetentionDays int
}

// Load reads configuration from environment variables (Spring Boot relaxed binding).
func Load() Config {
	return Config{
		ServerPort:              envString("SERVER_PORT", "8080"),
		MetricsCollectionPeriod: envDuration("METRICS_COLLECTION_INTERVAL", 60*time.Second),
		MetricsUIEnabled:        envBool("METRICS_UI_ENABLED", true),
		DockerEnabled:           envBool("DOCKER_ENABLED", true),
		DockerCollectionPeriod:  envDuration("DOCKER_COLLECTION_INTERVAL", 15*time.Second),
		DemoMode:                envBool("DEMO_MODE", false),
		HubEnabled:              envBool("METRICS_HUB_ENABLED", false),
		LoggingFileName:         envString("LOGGING_FILE_NAME", "metrics-collector.log"),

		MetricsPushEnabled:    envBool("METRICS_PUSH_ENABLED", false),
		MetricsPushIngestURL:  envString("METRICS_PUSH_INGEST_URL", ""),
		MetricsPushAgentID:    envString("METRICS_PUSH_AGENT_ID", ""),
		MetricsPushAuthToken:  envString("METRICS_PUSH_AUTH_TOKEN", ""),
		MetricsPushTimeout:    envDuration("METRICS_PUSH_TIMEOUT", 5*time.Second),
		MetricsPushMaxRetries: envInt("METRICS_PUSH_MAX_RETRIES", 3),

		HubIngestToken: envString("METRICS_HUB_INGEST_TOKEN", ""),

		AlertsWebhookURL:      envString("METRICS_ALERTS_WEBHOOK_URL", ""),
		AlertsCPUThreshold:    envFloat("METRICS_ALERTS_CPU_THRESHOLD", 90),
		AlertsMemoryThreshold: envFloat("METRICS_ALERTS_MEMORY_THRESHOLD", 0.90),
		AlertsDiskThreshold:   envFloat("METRICS_ALERTS_DISK_THRESHOLD", 90),
		AlertsCooldown:        envDuration("METRICS_ALERTS_COOLDOWN", 10*time.Minute),
		AlertsStaleMultiplier: envFloat("METRICS_ALERTS_STALE_MULTIPLIER", 2.0),

		HistoryEnabled:       envBool("METRICS_HISTORY_ENABLED", true),
		HistoryDBPath:        envString("METRICS_HISTORY_DB_PATH", "metrics-history.db"),
		HistoryProfile:       envString("METRICS_HISTORY_PROFILE", "full"),
		HistoryRetentionDays: envInt("METRICS_HISTORY_RETENTION_DAYS", 30),
	}
}

func envString(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return parsed
}

func envFloat(key string, fallback float64) float64 {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	if ms, err := strconv.ParseInt(v, 10, 64); err == nil {
		return time.Duration(ms) * time.Millisecond
	}
	if d, err := time.ParseDuration(v); err == nil {
		return d
	}
	return fallback
}
