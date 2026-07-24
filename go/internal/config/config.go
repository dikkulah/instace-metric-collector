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
