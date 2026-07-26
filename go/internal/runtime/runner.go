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

	"github.com/dikkulah/instance-metric-collector/go/internal/alert"
	"github.com/dikkulah/instance-metric-collector/go/internal/appmode"
	"github.com/dikkulah/instance-metric-collector/go/internal/collector"
	"github.com/dikkulah/instance-metric-collector/go/internal/config"
	"github.com/dikkulah/instance-metric-collector/go/internal/demo"
	"github.com/dikkulah/instance-metric-collector/go/internal/diagnostic"
	"github.com/dikkulah/instance-metric-collector/go/internal/docker"
	"github.com/dikkulah/instance-metric-collector/go/internal/footprint"
	"github.com/dikkulah/instance-metric-collector/go/internal/history"
	"github.com/dikkulah/instance-metric-collector/go/internal/hub"
	"github.com/dikkulah/instance-metric-collector/go/internal/logoutput"
	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
	"github.com/dikkulah/instance-metric-collector/go/internal/probe"
	"github.com/dikkulah/instance-metric-collector/go/internal/push"
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
		"push_enabled", cfg.MetricsPushEnabled,
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
	var hubStats *hub.Stats
	var histStore *history.Store
	var alertCfg *alert.ConfigStore
	var notifCfg *alert.NotificationConfigStore
	var alertEngine *alert.Engine
	var silenceStore *alert.SilenceStore
	var diagEngine *diagnostic.Engine

	if mode == appmode.Hub {
		registry = hub.NewRegistry()
		hubStats = hub.NewStats()
		if cfg.HistoryEnabled {
			var err error
			histStore, err = history.Open(cfg.HistoryDBPath, cfg.HistoryProfile, cfg.HistoryRetentionDays)
			if err != nil {
				logger.Warn("history store unavailable", "err", err)
			} else {
				logger.Info("history store enabled", "path", cfg.HistoryDBPath, "profile", cfg.HistoryProfile)
				go func() {
					rollupTicker := time.NewTicker(time.Hour)
					retentionTicker := time.NewTicker(24 * time.Hour)
					defer rollupTicker.Stop()
					defer retentionTicker.Stop()
					for {
						select {
						case <-ctx.Done():
							return
						case <-rollupTicker.C:
							if err := histStore.RunHourlyRollup(ctx); err != nil {
								logger.Warn("hourly rollup failed", "err", err)
							}
							if err := histStore.RunDailyRollup(ctx); err != nil {
								logger.Warn("daily rollup failed", "err", err)
							}
						case <-retentionTicker.C:
							if err := histStore.RunRetention(ctx); err != nil {
								logger.Warn("history retention failed", "err", err)
							}
						}
					}
				}()
			}
		}

		alertCfg = alert.LoadConfigStore(cfg, histStore)
		notifCfg = alert.LoadNotificationConfigStore(histStore)
		silenceStore = alert.LoadSilenceStore(histStore)
		diagEngine = diagnostic.NewEngine(histStore, alertCfg)

		if histStore != nil {
			if catalog, err := histStore.ListKnownAgents(); err != nil {
				logger.Warn("agent catalog load failed", "err", err)
			} else if len(catalog) > 0 {
				staleAfter := alertCfg.StaleAfter(cfg.MetricsCollectionPeriod)
				offlineAfter := alertCfg.OfflineAfter(cfg.HubOfflineAfter)
				registry.Hydrate(hub.SummariesFromCatalog(catalog, staleAfter, offlineAfter))
				logger.Info("agent catalog hydrated", "count", len(catalog))
			}
		}

		if alert.AlertsEnabled(cfg, notifCfg) {
			var onSent func(alert.Event)
			if histStore != nil {
				onSent = func(ev alert.Event) {
					_ = histStore.SaveAlertEvent(ev, "OPEN")
				}
			}
			notifier := alert.BuildNotifierChain(cfg, notifCfg, onSent)
			rules := alert.DefaultRules(alertCfg)
			alertEngine = alert.NewEngine(rules, notifier, alertCfg, logger)
			alertEngine.SetStats(hubStats)
			alertEngine.SetSilences(silenceStore)
			alertEngine.SetSustainedWindow(alertCfg.SustainedWindow())
			if histStore != nil {
				alertEngine.SetResolver(histStore)
			}
			go alertEngine.Run(ctx)
			go alertEngine.RunStaleChecker(ctx, cfg.MetricsCollectionPeriod, cfg.MetricsCollectionPeriod, func() []alert.AgentSeen {
				seen := registry.ListAgentSeen()
				out := make([]alert.AgentSeen, len(seen))
				for i, a := range seen {
					out[i] = alert.AgentSeen{AgentID: a.AgentID, Hostname: a.Hostname, LastSeen: a.LastSeen}
				}
				return out
			})
			logger.Info("alert engine enabled",
				"webhook", cfg.AlertsWebhookURL != "",
				"slack", cfg.AlertsSlackWebhookURL != "",
				"discord", cfg.AlertsDiscordWebhookURL != "",
				"email", alert.BuildNotificationResponse(cfg, notifCfg).Channels["email"].Enabled,
			)
		}
	}

	var pushClient *push.Client
	var pushSpool *push.Spool
	if mode == appmode.Agent && cfg.MetricsPushEnabled {
		if cfg.MetricsPushIngestURL == "" {
			logger.Error("METRICS_PUSH_ENABLED but METRICS_PUSH_INGEST_URL is empty; push disabled")
		} else {
			agentID := cfg.MetricsPushAgentID
			if agentID == "" {
				agentID, _ = os.Hostname()
			}
			hostname, _ := os.Hostname()
			if cfg.MetricsPushSpoolPath != "" {
				var err error
				pushSpool, err = push.OpenSpool(cfg.MetricsPushSpoolPath, cfg.MetricsPushSpoolMax)
				if err != nil {
					logger.Warn("push spool unavailable", "path", cfg.MetricsPushSpoolPath, "err", err)
				} else {
					if pending, err := pushSpool.Len(); err == nil && pending > 0 {
						logger.Info("push spool pending", "count", pending, "path", cfg.MetricsPushSpoolPath)
					}
				}
			}
			pushClient = push.NewClient(push.Options{
				IngestURL:  cfg.MetricsPushIngestURL,
				AgentID:    agentID,
				Hostname:   hostname,
				AuthToken:  cfg.MetricsPushAuthToken,
				Timeout:    cfg.MetricsPushTimeout,
				MaxRetries: cfg.MetricsPushMaxRetries,
			}, pushSpool, logger)
			go pushClient.Run(ctx)
			logger.Info("push client enabled",
				"ingest_url", cfg.MetricsPushIngestURL,
				"agent_id", agentID,
				"spool", cfg.MetricsPushSpoolPath,
			)
		}
	}

	probeCfg := probe.LoadFromEnv()

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
	} else if mode == appmode.Agent {
		metricsCollector = collector.New()
	}

	deps := web.Deps{
		Mode:          mode,
		Config:        cfg,
		MetricsStore:  metricsStore,
		Registry:      registry,
		Containers:    containers,
		AlertEngine:   alertEngine,
		AlertConfig:        alertCfg,
		NotificationConfig: notifCfg,
		AlertSilences:      silenceStore,
		DiagEngine:    diagEngine,
		History:       histStore,
		HubStats:      hubStats,
		Logger:        logger,
	}

	var httpServer *http.Server
	if cfg.MetricsUIEnabled {
		if cfg.DemoMode && mode == appmode.Agent {
			metricsStore.Push(demo.BuildSnapshot(0))
		}
		srv := web.NewServer(deps)
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

	// Hub mode: no local collector loop — data arrives via ingest only.
	if mode == appmode.Hub {
		<-ctx.Done()
		logger.Info("shutdown", "mode", string(mode), "signal", ctx.Err().Error())
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if httpServer != nil {
			_ = httpServer.Shutdown(shutdownCtx)
		}
		if histStore != nil {
			_ = histStore.Close()
		}
		return nil
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
					start := time.Now()
					p, err := metricsCollector.Collect(ctx)
					collectMs := time.Since(start).Milliseconds()
					if err != nil {
						logger.Warn("collect failed", "err", err)
						continue
					}
					p.Containers = containers.Cached()
					p.ConnectivityProbes = probe.Run(ctx, probeCfg)
					footprint.Apply(&p, collectMs)
					snap = payload.Snapshot{
						CollectedAt: time.Now().UTC().Format(time.RFC3339Nano),
						Payload:     p,
					}
				}
				metricsStore.Push(snap)
				if payloadLog != nil {
					if err := payloadLog.Write(snap.Payload); err != nil {
						logger.Warn("payload log write failed", "err", err)
					}
				}
				if pushClient != nil {
					pushClient.Enqueue(snap)
				}
				logger.Info("heartbeat",
					"mode", string(mode),
					"phase", "G5.1",
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
		if pushSpool != nil {
			_ = pushSpool.Close()
		}
		logger.Info("stopped", "mode", string(mode))
		return nil
	case <-shutdownCtx.Done():
		if pushSpool != nil {
			_ = pushSpool.Close()
		}
		logger.Warn("shutdown timeout", "mode", string(mode))
		return shutdownCtx.Err()
	}
}
