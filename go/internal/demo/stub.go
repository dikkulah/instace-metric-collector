package demo

import (
	"math"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

// BuildSnapshot returns a deterministic demo snapshot for UI development (G0–G4).
func BuildSnapshot(tick int) payload.Snapshot {
	phase := float64(tick%20) / 20.0
	cpu := 12.0 + 28.0*math.Sin(phase*2*math.Pi)

	return payload.Snapshot{
		CollectedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Payload: payload.MetricsPayload{
			CPULoad:             cpu,
			UsedMemory:          8_589_934_592,
			TotalMemory:         17_179_869_184,
			AvailableProcessors: 8,
			SystemLoadAverage:   cpu / 100.0 * 8,
			ProcessInfos: []payload.ProcessInfo{
				{User: "dikkulah", PID: 1234, CPUUsage: 4.2, MemoryUsage: 1.8, Command: "/usr/bin/java -jar metrics-collector.jar"},
				{User: "root", PID: 1, CPUUsage: 0.1, MemoryUsage: 0.2, Command: "/sbin/init"},
				{User: "dikkulah", PID: 5678, CPUUsage: 2.1, MemoryUsage: 0.9, Command: "node /app/server.js"},
			},
			ServiceInfos: []payload.ServiceInfo{
				{ServiceName: "com.docker.docker", Status: "RUNNING", Description: "Docker Desktop"},
				{ServiceName: "homebrew.mxcl.postgresql", Status: "RUNNING", Description: "PostgreSQL"},
				{ServiceName: "org.nginx.nginx", Status: "STOPPED", Description: "nginx"},
			},
			Containers: []payload.ContainerInfo{
				{
					ID:             "abc123def456",
					Name:           "instace-metric-collector-metrics-collector-1",
					Image:          "instace-metric-collector:latest",
					Status:         "running",
					Health:         "healthy",
					RestartCount:   0,
					ComposeProject: "instace-metric-collector",
					ComposeService: "metrics-collector",
					Ports:          []string{"8081:8080/tcp"},
				},
				{
					ID:             "redis789",
					Name:           "redis",
					Image:          "redis:7-alpine",
					Status:         "running",
					Health:         "healthy",
					RestartCount:   1,
					ComposeProject: "instace-metric-collector",
					ComposeService: "redis",
					Ports:          []string{"6379:6379/tcp"},
				},
			},
			DiskUsage: []payload.DiskUsageInfo{
				{Mount: "/", Filesystem: "apfs", TotalBytes: 500_000_000_000, UsedBytes: 320_000_000_000, UsePercent: 64.0},
				{Mount: "/Volumes/Data", Filesystem: "apfs", TotalBytes: 1_000_000_000_000, UsedBytes: 450_000_000_000, UsePercent: 45.0},
			},
			NetworkUsage: []payload.NetworkUsageInfo{
				{Name: "en0", BytesReceived: 1_234_567_890, BytesSent: 987_654_321},
				{Name: "lo0", BytesReceived: 12_345_678, BytesSent: 12_345_678},
			},
		},
	}
}
