//go:build linux

package collector

import (
	"bufio"
	"context"
	"os/exec"
	"strings"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func collectServices(ctx context.Context) ([]payload.ServiceInfo, error) {
	cmd := exec.CommandContext(ctx, "systemctl", "list-units", "--type=service", "--state=running", "--no-pager", "--no-legend")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	var services []payload.ServiceInfo
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		cols := strings.Fields(line)
		if len(cols) < 4 {
			continue
		}
		name := cols[0]
		desc := ""
		if len(cols) >= 5 {
			desc = strings.Join(cols[4:], " ")
		}
		services = append(services, payload.ServiceInfo{
			ServiceName: name,
			Status:      "RUNNING",
			Description: desc,
		})
	}
	return services, scanner.Err()
}
