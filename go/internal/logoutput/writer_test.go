package logoutput

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func TestPayloadWriterWritesJSONLine(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "metrics-collector.log")

	w, err := NewPayloadWriter(path)
	if err != nil {
		t.Fatalf("NewPayloadWriter: %v", err)
	}
	t.Cleanup(func() { _ = w.Close() })

	p := payload.MetricsPayload{
		CPULoad:             0.42,
		UsedMemory:          600,
		TotalMemory:         1000,
		ProcessInfos:        []payload.ProcessInfo{},
		ServiceInfos:        []payload.ServiceInfo{},
		Containers:          []payload.ContainerInfo{},
		DiskUsage:           []payload.DiskUsageInfo{},
		NetworkUsage:        []payload.NetworkUsageInfo{},
		AvailableProcessors: 4,
		SystemLoadAverage:   -1,
	}
	if err := w.Write(p); err != nil {
		t.Fatalf("Write: %v", err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	if len(raw) == 0 {
		t.Fatal("expected non-empty log file")
	}
	if raw[len(raw)-1] != '\n' {
		t.Fatal("expected trailing newline")
	}
	if !strings.Contains(string(raw), `"cpuLoad"`) || !strings.Contains(string(raw), `"usedMemory"`) || !strings.Contains(string(raw), `"processInfos"`) {
		t.Fatalf("unexpected log line: %s", raw)
	}
}
