package alert

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// DiscordNotifier posts alerts to a Discord incoming webhook.
type DiscordNotifier struct {
	URL     string
	Timeout time.Duration
	Client  *http.Client
}

func NewDiscordNotifier(url string, timeout time.Duration) *DiscordNotifier {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return &DiscordNotifier{
		URL:     url,
		Timeout: timeout,
		Client:  &http.Client{Timeout: timeout},
	}
}

func (d *DiscordNotifier) Notify(ctx context.Context, ev Event) error {
	if d == nil || d.URL == "" {
		return nil
	}
	body, err := json.Marshal(map[string]string{
		"content": FormatAlertText(WithNotifyDefaults(ev)),
	})
	if err != nil {
		return fmt.Errorf("marshal discord alert: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, d.URL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := d.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("discord webhook returned %d", resp.StatusCode)
	}
	return nil
}
