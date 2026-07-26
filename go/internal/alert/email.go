package alert

import (
	"context"
	"fmt"
	"net/smtp"
	"strings"
	"time"
)

// EmailNotifier delivers alerts via SMTP.
type EmailNotifier struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
	To       []string
	Timeout  time.Duration
}

// NewEmailNotifier builds an SMTP notifier. Returns nil when host or recipients are unset.
func NewEmailNotifier(host string, port int, user, password, from string, to []string, timeout time.Duration) *EmailNotifier {
	host = strings.TrimSpace(host)
	from = strings.TrimSpace(from)
	var recipients []string
	for _, addr := range to {
		if a := strings.TrimSpace(addr); a != "" {
			recipients = append(recipients, a)
		}
	}
	if host == "" || from == "" || len(recipients) == 0 {
		return nil
	}
	if port <= 0 {
		port = 587
	}
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	return &EmailNotifier{
		Host:     host,
		Port:     port,
		User:     strings.TrimSpace(user),
		Password: password,
		From:     from,
		To:       recipients,
		Timeout:  timeout,
	}
}

func (e *EmailNotifier) Notify(ctx context.Context, ev Event) error {
	if e == nil || e.Host == "" || len(e.To) == 0 {
		return nil
	}
	ev = WithNotifyDefaults(ev)
	subject := fmt.Sprintf("[%s] %s on %s", ev.Severity, ev.AlertType, ev.AgentID)
	body := FormatAlertText(ev)
	msg := buildEmailMessage(e.From, e.To, subject, body)

	addr := fmt.Sprintf("%s:%d", e.Host, e.Port)
	done := make(chan error, 1)
	go func() {
		var auth smtp.Auth
		if e.User != "" {
			auth = smtp.PlainAuth("", e.User, e.Password, e.Host)
		}
		done <- smtp.SendMail(addr, auth, e.From, e.To, []byte(msg))
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-done:
		if err != nil {
			return fmt.Errorf("smtp send: %w", err)
		}
		return nil
	}
}

func buildEmailMessage(from string, to []string, subject, body string) string {
	headers := []string{
		"From: " + from,
		"To: " + strings.Join(to, ", "),
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}
	return strings.Join(headers, "\r\n")
}
