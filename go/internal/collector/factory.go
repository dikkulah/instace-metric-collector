package collector

import (
	"context"
	"runtime"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

// New returns the platform metrics collector.
func New() Collector {
	return &aggregate{os: runtime.GOOS}
}

type aggregate struct {
	os string
}

func (a *aggregate) Collect(ctx context.Context) (payload.MetricsPayload, error) {
	sys, err := collectSystem(ctx)
	if err != nil {
		return payload.MetricsPayload{}, err
	}
	procs, err := collectProcesses(ctx)
	if err != nil {
		procs = nil
	}
	svcs, err := collectServices(ctx)
	if err != nil {
		svcs = nil
	}
	sys.ProcessInfos = procs
	sys.ServiceInfos = svcs
	return sys, nil
}
