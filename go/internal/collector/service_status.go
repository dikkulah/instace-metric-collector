package collector

// serviceStatusFromCode maps launchctl exit/status codes to Java ServiceStatus names.
func serviceStatusFromCode(code int) string {
	switch {
	case code == 0:
		return "RUNNING"
	case code > 0:
		return "ERROR"
	default:
		return "STOPPED"
	}
}
