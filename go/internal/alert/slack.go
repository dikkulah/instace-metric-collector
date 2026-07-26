package alert

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// SlackNotifier posts alerts to a Slack incoming webhook.
type SlackNotifier struct {
	URL     string
	Timeout time.Duration
	Client  *http.Client
}

func NewSlackNotifier(url string, timeout time.Duration) *SlackNotifier {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return &SlackNotifier{
		URL:     url,
		Timeout: timeout,
		Client:  &http.Client{Timeout: timeout},
	}
}

func (s *SlackNotifier) Notify(ctx context.Context, ev Event) error {
	if s == nil || s.URL == "" {
		return nil
	}
	body, err := json.Marshal(map[string]string{
		"text": FormatAlertText(WithNotifyDefaults(ev)),
	})
	if err != nil {
		return fmt.Errorf("marshal slack alert: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.URL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("slack webhook returned %d", resp.StatusCode)
	}
	return nil
}
