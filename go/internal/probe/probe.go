package probe

import (
	"context"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

// Config lists probe targets from METRICS_PROBE_TARGETS env (comma-separated host:port or http URLs).
type Config struct {
	Targets []string
	Timeout time.Duration
}

func LoadFromEnv() Config {
	raw := strings.TrimSpace(os.Getenv("METRICS_PROBE_TARGETS"))
	if raw == "" {
		return Config{Timeout: 3 * time.Second}
	}
	var targets []string
	for _, t := range strings.Split(raw, ",") {
		if t = strings.TrimSpace(t); t != "" {
			targets = append(targets, t)
		}
	}
	timeout := 3 * time.Second
	if v := strings.TrimSpace(os.Getenv("METRICS_PROBE_TIMEOUT")); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			timeout = d
		}
	}
	return Config{Targets: targets, Timeout: timeout}
}

// Run executes configured connectivity probes.
func Run(ctx context.Context, cfg Config) []payload.ConnectivityProbe {
	if len(cfg.Targets) == 0 {
		return nil
	}
	out := make([]payload.ConnectivityProbe, 0, len(cfg.Targets))
	for _, target := range cfg.Targets {
		out = append(out, probeOne(ctx, target, cfg.Timeout))
	}
	return out
}

func probeOne(ctx context.Context, target string, timeout time.Duration) payload.ConnectivityProbe {
	start := time.Now()
	lower := strings.ToLower(target)
	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") {
		return probeHTTP(ctx, target, timeout, start)
	}
	return probeTCP(ctx, target, timeout, start)
}

func probeTCP(ctx context.Context, target string, timeout time.Duration, start time.Time) payload.ConnectivityProbe {
	dctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	conn, err := (&net.Dialer{}).DialContext(dctx, "tcp", target)
	if err != nil {
		return payload.ConnectivityProbe{Target: target, OK: false, Error: err.Error()}
	}
	_ = conn.Close()
	return payload.ConnectivityProbe{Target: target, OK: true, LatencyMs: time.Since(start).Milliseconds()}
}

func probeHTTP(ctx context.Context, target string, timeout time.Duration, start time.Time) payload.ConnectivityProbe {
	dctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(dctx, http.MethodGet, target, nil)
	if err != nil {
		return payload.ConnectivityProbe{Target: target, OK: false, Error: err.Error()}
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return payload.ConnectivityProbe{Target: target, OK: false, Error: err.Error()}
	}
	defer resp.Body.Close()
	ok := resp.StatusCode < 500
	result := payload.ConnectivityProbe{Target: target, OK: ok, LatencyMs: time.Since(start).Milliseconds()}
	if !ok {
		result.Error = resp.Status
	}
	return result
}
