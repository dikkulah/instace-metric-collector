package runtime

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/appmode"
	"github.com/dikkulah/instance-metric-collector/go/internal/collector"
	"github.com/dikkulah/instance-metric-collector/go/internal/config"
	"github.com/dikkulah/instance-metric-collector/go/internal/demo"
	"github.com/dikkulah/instance-metric-collector/go/internal/docker"
	"github.com/dikkulah/instance-metric-collector/go/internal/hub"
	"github.com/dikkulah/instance-metric-collector/go/internal/logoutput"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
	"github.com/dikkulah/instance-metric-collector/go/internal/store"
	"github.com/dikkulah/instance-metric-collector/go/internal/web"
)

// Run starts the metrics loop and optional HTTP server until SIGINT/SIGTERM.
func Run(ctx context.Context, mode appmode.Mode, cfg config.Config) error {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	ctx, stop := signal.NotifyContext(ctx, syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	logger.Info("startup",
		"mode", string(mode),
		"port", cfg.ServerPort,
		"collection_interval", cfg.MetricsCollectionPeriod.String(),
		"ui_enabled", cfg.MetricsUIEnabled,
		"docker_enabled", cfg.DockerEnabled,
		"demo_mode", cfg.DemoMode,
		"hub_enabled", cfg.HubEnabled,
	)

	metricsStore := store.NewSnapshotStore(120)
	var payloadLog *logoutput.PayloadWriter
	if mode == appmode.Agent && cfg.LoggingFileName != "" {
		var err error
		payloadLog, err = logoutput.NewPayloadWriter(cfg.LoggingFileName)
		if err != nil {
			return fmt.Errorf("payload log: %w", err)
		}
		defer payloadLog.Close()
		logger.Info("payload log enabled", "path", cfg.LoggingFileName)
	}
	var registry *hub.Registry
	if mode == appmode.Hub {
		registry = hub.NewRegistry()
	}

	var containers docker.ContainerSource = docker.NoopSource{}
	if cfg.DockerEnabled && mode == appmode.Agent {
		if dc, err := docker.NewCollector(logger); err != nil {
			logger.Warn("docker unavailable", "err", err)
		} else {
			containers = dc
			go dc.Run(ctx, cfg.DockerCollectionPeriod)
		}
	}

	var metricsCollector collector.Collector
	if cfg.DemoMode {
		metricsCollector = nil
	} else {
		metricsCollector = collector.New()
	}

	var httpServer *http.Server
	if cfg.MetricsUIEnabled {
		srv := web.NewServer(mode, cfg, metricsStore, registry, containers, logger)
		httpServer = &http.Server{
			Addr:              ":" + cfg.ServerPort,
			Handler:           srv.Handler(),
			ReadHeaderTimeout: 10 * time.Second,
		}
		go func() {
			logger.Info("http listening", "addr", httpServer.Addr, "mode", string(mode))
			if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				logger.Error("http server error", "err", err)
			}
		}()
	}

	ticker := time.NewTicker(cfg.MetricsCollectionPeriod)
	defer ticker.Stop()

	tick := 0
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				tick++
				var snap payload.Snapshot
				if cfg.DemoMode || metricsCollector == nil {
					snap = demo.BuildSnapshot(tick)
				} else {
					p, err := metricsCollector.Collect(ctx)
					if err != nil {
						logger.Warn("collect failed", "err", err)
						continue
					}
					p.Containers = containers.Cached()
					snap = payload.Snapshot{
						CollectedAt: time.Now().UTC().Format(time.RFC3339Nano),
						Payload:     p,
					}
				}
				if mode == appmode.Agent {
					metricsStore.Push(snap)
					if payloadLog != nil {
						if err := payloadLog.Write(snap.Payload); err != nil {
							logger.Warn("payload log write failed", "err", err)
						}
					}
				}
				logger.Info("heartbeat",
					"mode", string(mode),
					"phase", "G2",
					"cpu", fmt.Sprintf("%.1f", snap.Payload.CPULoad),
					"processes", len(snap.Payload.ProcessInfos),
					"services", len(snap.Payload.ServiceInfos),
					"containers", len(snap.Payload.Containers),
				)
			}
		}
	}()

	<-ctx.Done()
	logger.Info("shutdown", "mode", string(mode), "signal", ctx.Err().Error())

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if httpServer != nil {
		_ = httpServer.Shutdown(shutdownCtx)
	}

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		logger.Info("stopped", "mode", string(mode))
		return nil
	case <-shutdownCtx.Done():
		logger.Warn("shutdown timeout", "mode", string(mode))
		return shutdownCtx.Err()
	}
}
