package probe

import (
	"context"
	"os"
	"strings"
	"testing"
)

func TestLoadFromEnvCapsTargets(t *testing.T) {
	t.Setenv("METRICS_PROBE_TARGETS", strings.Join([]string{
		"t1:80", "t2:80", "t3:80", "t4:80", "t5:80",
		"t6:80", "t7:80", "t8:80", "t9:80", "t10:80",
		"t11:80", "t12:80", "t13:80", "t14:80", "t15:80",
		"t16:80", "t17:80", "t18:80",
	}, ","))
	t.Setenv("METRICS_PROBE_MAX_TARGETS", "5")

	cfg := LoadFromEnv()
	if len(cfg.Targets) != 5 {
		t.Fatalf("targets = %d, want cap 5", len(cfg.Targets))
	}
	if cfg.Targets[0] != "t1:80" || cfg.Targets[4] != "t5:80" {
		t.Fatalf("targets = %v", cfg.Targets)
	}
}

func TestRunRespectsCap(t *testing.T) {
	t.Setenv("METRICS_PROBE_TARGETS", "127.0.0.1:1,127.0.0.1:2,127.0.0.1:3")
	t.Setenv("METRICS_PROBE_MAX_TARGETS", "2")
	cfg := LoadFromEnv()
	results := Run(context.Background(), cfg)
	if len(results) != 2 {
		t.Fatalf("results = %d", len(results))
	}
}

func TestDefaultMaxTargets(t *testing.T) {
	_ = os.Unsetenv("METRICS_PROBE_MAX_TARGETS")
	t.Setenv("METRICS_PROBE_TARGETS", strings.Repeat("h:1,", 20))
	cfg := LoadFromEnv()
	if len(cfg.Targets) != defaultMaxTargets {
		t.Fatalf("default cap = %d, want %d", len(cfg.Targets), defaultMaxTargets)
	}
}
