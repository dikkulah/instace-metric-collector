package runtime

import (
	"context"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/appmode"
	"github.com/dikkulah/instance-metric-collector/go/internal/config"
)

func TestRunStopsOnCancel(t *testing.T) {
	cfg := config.Config{
		MetricsCollectionPeriod: 50 * time.Millisecond,
		ServerPort:              "18080",
		MetricsUIEnabled:        false,
	}
	ctx, cancel := context.WithCancel(context.Background())

	errCh := make(chan error, 1)
	go func() {
		errCh <- Run(ctx, appmode.Agent, cfg)
	}()

	time.Sleep(120 * time.Millisecond)
	cancel()

	select {
	case err := <-errCh:
		if err != nil {
			t.Fatalf("Run() error = %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Run() did not stop after cancel")
	}
}
