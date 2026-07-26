package alert

import (
	"strings"
	"testing"
)

func TestNewEmailNotifierRequiresConfig(t *testing.T) {
	if NewEmailNotifier("", 587, "", "", "from@example.com", []string{"to@example.com"}, 0) != nil {
		t.Fatal("expected nil without host")
	}
	if NewEmailNotifier("smtp.example.com", 587, "", "", "", []string{"to@example.com"}, 0) != nil {
		t.Fatal("expected nil without from")
	}
	if NewEmailNotifier("smtp.example.com", 587, "", "", "from@example.com", nil, 0) != nil {
		t.Fatal("expected nil without recipients")
	}
	n := NewEmailNotifier("smtp.example.com", 587, "user", "pass", "from@example.com", []string{"a@b.com", ""}, 0)
	if n == nil || n.Port != 587 || len(n.To) != 1 {
		t.Fatalf("notifier = %+v", n)
	}
}

func TestBuildEmailMessage(t *testing.T) {
	msg := buildEmailMessage("hub@example.com", []string{"ops@example.com"}, "CPU_HIGH", "alert body")
	if !strings.Contains(msg, "From: hub@example.com") {
		t.Fatalf("msg = %q", msg)
	}
	if !strings.Contains(msg, "To: ops@example.com") {
		t.Fatalf("msg = %q", msg)
	}
	if !strings.Contains(msg, "Subject: CPU_HIGH") {
		t.Fatalf("msg = %q", msg)
	}
	if !strings.Contains(msg, "alert body") {
		t.Fatalf("msg = %q", msg)
	}
}
