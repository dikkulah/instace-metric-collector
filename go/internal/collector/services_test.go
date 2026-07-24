package collector

import "testing"

func TestServiceStatusFromCode(t *testing.T) {
	if serviceStatusFromCode(0) != "RUNNING" {
		t.Fatal("expected RUNNING")
	}
	if serviceStatusFromCode(1) != "ERROR" {
		t.Fatal("expected ERROR")
	}
	if serviceStatusFromCode(-1) != "STOPPED" {
		t.Fatal("expected STOPPED")
	}
}
