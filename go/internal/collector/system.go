package collector

import (
	"context"
	"math"
	"strings"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"
)

func collectSystem(ctx context.Context) (payload.MetricsPayload, error) {
	_ = ctx
	out := payload.MetricsPayload{}

	if percents, err := cpu.Percent(200*time.Millisecond, false); err == nil && len(percents) > 0 {
		out.CPULoad = percents[0]
	}
	if cores, err := cpu.Counts(true); err == nil {
		out.AvailableProcessors = cores
	}
	if vm, err := mem.VirtualMemory(); err == nil {
		out.TotalMemory = int64(vm.Total)
		out.UsedMemory = int64(vm.Used)
	}
	if avg, err := load.Avg(); err == nil {
		out.SystemLoadAverage = avg.Load1
	}

	out.DiskUsage = collectDisk()
	out.NetworkUsage = collectNetwork()
	return out, nil
}

func collectDisk() []payload.DiskUsageInfo {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return nil
	}
	out := make([]payload.DiskUsageInfo, 0, len(partitions))
	for _, p := range partitions {
		if p.Mountpoint == "" {
			continue
		}
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}
		out = append(out, payload.DiskUsageInfo{
			Mount:      p.Mountpoint,
			Filesystem: p.Fstype,
			TotalBytes: int64(usage.Total),
			UsedBytes:  int64(usage.Used),
			UsePercent: usage.UsedPercent,
		})
	}
	return out
}

func collectNetwork() []payload.NetworkUsageInfo {
	counters, err := net.IOCounters(true)
	if err != nil {
		return nil
	}
	out := make([]payload.NetworkUsageInfo, 0, len(counters))
	for _, c := range counters {
		name := c.Name
		if name == "lo" || name == "lo0" {
			continue
		}
		out = append(out, payload.NetworkUsageInfo{
			Name:          name,
			BytesReceived: int64(c.BytesRecv),
			BytesSent:     int64(c.BytesSent),
		})
	}
	return out
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}

func trimCommand(cmd string, max int) string {
	cmd = strings.TrimSpace(cmd)
	if len(cmd) <= max {
		return cmd
	}
	return cmd[:max] + "…"
}
