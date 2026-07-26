package alert

import "fmt"

// FormatAlertText returns a plain-text alert summary for chat webhooks.
func FormatAlertText(ev Event) string {
	status := ev.Status
	if status == "" {
		status = "OPEN"
	}
	agent := ev.AgentID
	if agent == "" {
		agent = "unknown"
	}
	return fmt.Sprintf("[%s] %s %s — %s", status, ev.Severity, agent, ev.Message)
}

// WithNotifyDefaults fills lifecycle fields for outbound notifications.
func WithNotifyDefaults(ev Event) Event {
	if ev.Status == "" {
		ev.Status = "OPEN"
	}
	return ev
}
