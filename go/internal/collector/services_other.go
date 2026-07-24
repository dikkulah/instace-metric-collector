//go:build !darwin && !linux

package collector

import (
	"context"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func collectServices(ctx context.Context) ([]payload.ServiceInfo, error) {
	_ = ctx
	return []payload.ServiceInfo{}, nil
}
