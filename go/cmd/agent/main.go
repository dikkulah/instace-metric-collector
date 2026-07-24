package main

import (
	"context"
	"log"
	"os"

	"github.com/dikkulah/instance-metric-collector/go/internal/appmode"
	"github.com/dikkulah/instance-metric-collector/go/internal/config"
	"github.com/dikkulah/instance-metric-collector/go/internal/runtime"
)

func main() {
	cfg := config.Load()
	if cfg.HubEnabled {
		log.Println("agent: METRICS_HUB_ENABLED is true; use cmd/hub for hub mode")
		os.Exit(1)
	}

	if err := runtime.Run(context.Background(), appmode.Agent, cfg); err != nil {
		log.Printf("agent stopped with error: %v", err)
		os.Exit(1)
	}
}
