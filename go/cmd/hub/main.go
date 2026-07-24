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
	cfg.HubEnabled = true

	if err := runtime.Run(context.Background(), appmode.Hub, cfg); err != nil {
		log.Printf("hub stopped with error: %v", err)
		os.Exit(1)
	}
}
