//go:build darwin

package collector

import (
	"bufio"
	"context"
	"os/exec"
	"strconv"
	"strings"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func collectServices(ctx context.Context) ([]payload.ServiceInfo, error) {
	cmd := exec.CommandContext(ctx, "launchctl", "list")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	first := true
	var services []payload.ServiceInfo
	for scanner.Scan() {
		if first {
			first = false
			continue
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 3 {
			continue
		}
		code, err := strconv.Atoi(parts[1])
		if err != nil {
			continue
		}
		name := strings.Join(parts[2:], " ")
		services = append(services, payload.ServiceInfo{
			ServiceName: name,
			Status:      serviceStatusFromCode(code),
			Description: "",
		})
	}
	return services, scanner.Err()
}
