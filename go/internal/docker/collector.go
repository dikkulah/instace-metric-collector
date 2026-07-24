package docker

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
	"github.com/moby/moby/api/types/container"
	mobyclient "github.com/moby/moby/client"
)

const (
	composeProjectLabel = "com.docker.compose.project"
	composeServiceLabel = "com.docker.compose.service"
)

// ContainerSource provides cached Docker container metadata.
type ContainerSource interface {
	Cached() []payload.ContainerInfo
	FindByID(id string) (payload.ContainerInfo, bool)
	AgentURL(containerID string) string
}

// Collector refreshes container list on an interval (Java DockerContainerCollector parity).
type Collector struct {
	client *mobyclient.Client
	logger *slog.Logger
	mu     sync.RWMutex
	cache  []payload.ContainerInfo
}

func NewCollector(logger *slog.Logger) (*Collector, error) {
	cli, err := mobyclient.New(mobyclient.FromEnv, mobyclient.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return &Collector{client: cli, logger: logger}, nil
}

func (c *Collector) Cached() []payload.ContainerInfo {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make([]payload.ContainerInfo, len(c.cache))
	copy(out, c.cache)
	return out
}

func (c *Collector) FindByID(id string) (payload.ContainerInfo, bool) {
	for _, item := range c.Cached() {
		if item.ID == id || strings.HasPrefix(item.ID, id) || strings.HasPrefix(id, item.ID) {
			return item, true
		}
	}
	return payload.ContainerInfo{}, false
}

// AgentURL returns http://127.0.0.1:{hostPort} for the first published 8080/tcp mapping.
func (c *Collector) AgentURL(containerID string) string {
	info, ok := c.FindByID(containerID)
	if !ok {
		return ""
	}
	for _, p := range info.Ports {
		parts := strings.Split(p, ":")
		if strings.Contains(p, ":8080/tcp") && len(parts) >= 2 {
			hostPort := strings.Split(parts[0], "/")[0]
			if hostPort != "" {
				return "http://127.0.0.1:" + hostPort
			}
		}
	}
	return ""
}

func (c *Collector) Run(ctx context.Context, interval time.Duration) {
	c.refresh()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.refresh()
		}
	}
}

func (c *Collector) refresh() {
	items, err := c.fetch()
	if err != nil {
		if c.logger != nil {
			c.logger.Warn("docker refresh failed", "err", err)
		}
		return
	}
	c.mu.Lock()
	c.cache = items
	c.mu.Unlock()
}

func (c *Collector) fetch() ([]payload.ContainerInfo, error) {
	if c.client == nil {
		return nil, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	res, err := c.client.ContainerList(ctx, mobyclient.ContainerListOptions{All: true})
	if err != nil {
		return nil, err
	}
	out := make([]payload.ContainerInfo, 0, len(res.Items))
	for _, ctr := range res.Items {
		if strings.Contains(strings.ToLower(ctr.Status), "removing") {
			continue
		}
		out = append(out, c.toInfo(ctx, ctr))
	}
	return out, nil
}

func (c *Collector) toInfo(ctx context.Context, ctr container.Summary) payload.ContainerInfo {
	name := resolveName(ctr.Names)
	status := resolveStatus(ctr.Status)
	labels := ctr.Labels
	if labels == nil {
		labels = map[string]string{}
	}
	restartCount := 0
	health := "none"
	if inspect, err := c.client.ContainerInspect(ctx, ctr.ID, mobyclient.ContainerInspectOptions{}); err == nil {
		restartCount = inspect.Container.RestartCount
		if inspect.Container.State != nil && inspect.Container.State.Health != nil && inspect.Container.State.Health.Status != "" {
			health = strings.ToLower(string(inspect.Container.State.Health.Status))
		}
	}
	return payload.ContainerInfo{
		ID:             ctr.ID,
		Name:           name,
		Image:          ctr.Image,
		Status:         status,
		Health:         health,
		RestartCount:   restartCount,
		ComposeProject: labels[composeProjectLabel],
		ComposeService: labels[composeServiceLabel],
		Ports:          resolvePorts(ctr.Ports),
	}
}

func resolveName(names []string) string {
	if len(names) == 0 {
		return "unknown"
	}
	return strings.TrimPrefix(names[0], "/")
}

func resolveStatus(status string) string {
	if status == "" {
		return "unknown"
	}
	return strings.ToLower(strings.Fields(status)[0])
}

func resolvePorts(ports []container.PortSummary) []string {
	if len(ports) == 0 {
		return nil
	}
	out := make([]string, 0, len(ports))
	for _, p := range ports {
		if p.PublicPort > 0 {
			out = append(out, fmt.Sprintf("%d:%d/%s", p.PublicPort, p.PrivatePort, p.Type))
		} else if p.PrivatePort > 0 {
			out = append(out, fmt.Sprintf("%d/%s", p.PrivatePort, p.Type))
		}
	}
	return out
}

// NoopSource is used when DOCKER_ENABLED=false (V4).
type NoopSource struct{}

func (NoopSource) Cached() []payload.ContainerInfo                  { return nil }
func (NoopSource) FindByID(string) (payload.ContainerInfo, bool)     { return payload.ContainerInfo{}, false }
func (NoopSource) AgentURL(string) string                             { return "" }
