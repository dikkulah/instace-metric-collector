package collector

import (
	"context"
	"sort"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
	"github.com/shirou/gopsutil/v4/process"
)

const maxProcesses = 50

func collectProcesses(ctx context.Context) ([]payload.ProcessInfo, error) {
	_ = ctx
	pids, err := process.Pids()
	if err != nil {
		return nil, err
	}
	type row struct {
		info payload.ProcessInfo
		cpu  float64
	}
	rows := make([]row, 0, len(pids))
	for _, pid := range pids {
		p, err := process.NewProcess(pid)
		if err != nil {
			continue
		}
		name, _ := p.Name()
		cmdline, _ := p.Cmdline()
		if cmdline == "" {
			cmdline = name
		}
		user, _ := p.Username()
		cpuPct, _ := p.CPUPercent()
		memPct, _ := p.MemoryPercent()
		rows = append(rows, row{
			info: payload.ProcessInfo{
				User:        user,
				PID:         int(pid),
				CPUUsage:    round1(cpuPct),
				MemoryUsage: round1(float64(memPct)),
				Command:     trimCommand(cmdline, 512),
			},
			cpu: cpuPct,
		})
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].cpu == rows[j].cpu {
			return rows[i].info.PID < rows[j].info.PID
		}
		return rows[i].cpu > rows[j].cpu
	})
	if len(rows) > maxProcesses {
		rows = rows[:maxProcesses]
	}
	out := make([]payload.ProcessInfo, len(rows))
	for i, r := range rows {
		out[i] = r.info
	}
	return out, nil
}
