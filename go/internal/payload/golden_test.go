package payload

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestGoldenMetricsPayloadRoundTrip(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	fixture := filepath.Join(filepath.Dir(file), "..", "..", "testdata", "golden-metrics-payload.json")
	raw, err := os.ReadFile(fixture)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	var p MetricsPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("unmarshal fixture: %v", err)
	}

	if p.CPULoad != 0.42 {
		t.Fatalf("cpuLoad = %v, want 0.42", p.CPULoad)
	}
	if p.UsedMemory != 600 || p.TotalMemory != 1000 {
		t.Fatalf("memory = %d/%d, want 600/1000", p.UsedMemory, p.TotalMemory)
	}
	if len(p.ProcessInfos) != 1 || p.ProcessInfos[0].PID != 1234 {
		t.Fatalf("processInfos = %+v", p.ProcessInfos)
	}
	if len(p.ServiceInfos) != 1 || p.ServiceInfos[0].ServiceName != "com.example.service" {
		t.Fatalf("serviceInfos = %+v", p.ServiceInfos)
	}
	if len(p.Containers) != 1 || p.Containers[0].Name != "web" {
		t.Fatalf("containers = %+v", p.Containers)
	}
	if len(p.DiskUsage) != 1 || p.DiskUsage[0].Mount != "/" {
		t.Fatalf("diskUsage = %+v", p.DiskUsage)
	}
	if len(p.NetworkUsage) != 1 || p.NetworkUsage[0].Name != "en0" {
		t.Fatalf("networkUsage = %+v", p.NetworkUsage)
	}
	if p.AvailableProcessors != 10 {
		t.Fatalf("availableProcessors = %d", p.AvailableProcessors)
	}
	if p.SystemLoadAverage != -1.0 {
		t.Fatalf("systemLoadAverage = %v", p.SystemLoadAverage)
	}

	encoded, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var again MetricsPayload
	if err := json.Unmarshal(encoded, &again); err != nil {
		t.Fatalf("round-trip unmarshal: %v", err)
	}
	if again.CPULoad != p.CPULoad || again.UsedMemory != p.UsedMemory {
		t.Fatalf("round-trip mismatch: %+v vs %+v", again, p)
	}
}
