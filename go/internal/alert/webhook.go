package alert

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// WebhookNotifier POSTs alert events to a configured URL.
type WebhookNotifier struct {
	URL     string
	Timeout time.Duration
	Client  *http.Client
}

func NewWebhookNotifier(url string, timeout time.Duration) *WebhookNotifier {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return &WebhookNotifier{
		URL:     url,
		Timeout: timeout,
		Client:  &http.Client{Timeout: timeout},
	}
}

func (w *WebhookNotifier) Notify(ctx context.Context, ev Event) error {
	if w == nil || w.URL == "" {
		return nil
	}
	body, err := json.Marshal(WithNotifyDefaults(ev))
	if err != nil {
		return fmt.Errorf("marshal alert: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.URL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := w.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("webhook returned %d", resp.StatusCode)
	}
	return nil
}
