package collector

import (
	"context"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

// Collector gathers a full MetricsPayload snapshot.
type Collector interface {
	Collect(ctx context.Context) (payload.MetricsPayload, error)
}
