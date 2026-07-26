package payload

// MetricsPayload mirrors the Java record for JSON contract parity.
type MetricsPayload struct {
	CPULoad              float64            `json:"cpuLoad"`
	UsedMemory           int64              `json:"usedMemory"`
	TotalMemory          int64              `json:"totalMemory"`
	ProcessInfos         []ProcessInfo      `json:"processInfos"`
	ServiceInfos         []ServiceInfo      `json:"serviceInfos"`
	Containers           []ContainerInfo    `json:"containers"`
	DiskUsage            []DiskUsageInfo    `json:"diskUsage"`
	NetworkUsage         []NetworkUsageInfo `json:"networkUsage"`
	ConnectivityProbes   []ConnectivityProbe `json:"connectivityProbes,omitempty"`
	AvailableProcessors  int                `json:"availableProcessors"`
	SystemLoadAverage    float64            `json:"systemLoadAverage"`
	// Agent self-metrics (ADR-013, additive V6).
	AgentMemoryBytes  int64 `json:"agentMemoryBytes,omitempty"`
	AgentGoroutines   int   `json:"agentGoroutines,omitempty"`
	CollectDurationMs int64 `json:"collectDurationMs,omitempty"`
}

type ProcessInfo struct {
	User        string  `json:"user"`
	PID         int     `json:"pid"`
	CPUUsage    float64 `json:"cpuUsage"`
	MemoryUsage float64 `json:"memoryUsage"`
	Command     string  `json:"command"`
}

type ServiceInfo struct {
	ServiceName string `json:"serviceName"`
	Status      string `json:"status"`
	Description string `json:"description"`
}

type ContainerInfo struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Image          string   `json:"image"`
	Status         string   `json:"status"`
	Health         string   `json:"health"`
	RestartCount   int      `json:"restartCount"`
	ComposeProject string   `json:"composeProject"`
	ComposeService string   `json:"composeService"`
	Ports          []string `json:"ports"`
}

type DiskUsageInfo struct {
	Mount       string  `json:"mount"`
	Filesystem  string  `json:"filesystem"`
	TotalBytes  int64   `json:"totalBytes"`
	UsedBytes   int64   `json:"usedBytes"`
	UsePercent  float64 `json:"usePercent"`
}

type NetworkUsageInfo struct {
	Name          string `json:"name"`
	BytesReceived int64  `json:"bytesReceived"`
	BytesSent     int64  `json:"bytesSent"`
}

// ConnectivityProbe reports reachability to a configured target (Phase 13, additive V6).
type ConnectivityProbe struct {
	Target    string `json:"target"`
	OK        bool   `json:"ok"`
	LatencyMs int64  `json:"latencyMs"`
	Error     string `json:"error,omitempty"`
}

// Snapshot is the REST/SSE envelope (Java MetricsSnapshot).
type Snapshot struct {
	CollectedAt string         `json:"collectedAt"`
	Payload     MetricsPayload `json:"payload"`
}

// AggregateMetricsPayload builds a rollup snapshot with CPU/memory averages only.
// Slice fields are non-nil so JSON encodes [] instead of null (UI expects arrays).
func AggregateMetricsPayload(cpuLoad float64, usedMemory, totalMemory int64) MetricsPayload {
	return MetricsPayload{
		CPULoad:      cpuLoad,
		UsedMemory:   usedMemory,
		TotalMemory:  totalMemory,
		ProcessInfos: []ProcessInfo{},
		ServiceInfos: []ServiceInfo{},
		Containers:   []ContainerInfo{},
		DiskUsage:    []DiskUsageInfo{},
		NetworkUsage: []NetworkUsageInfo{},
	}
}
