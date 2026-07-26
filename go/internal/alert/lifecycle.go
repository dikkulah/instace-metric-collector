package alert

// OpenAlertResolver auto-resolves OPEN/ACK alerts when conditions clear.
type OpenAlertResolver interface {
	ResolveOpenAlerts(agentID, ruleID string) (int, error)
}
