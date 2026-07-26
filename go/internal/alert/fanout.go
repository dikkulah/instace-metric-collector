package alert

import "context"

// FanoutNotifier delivers events to multiple channels; succeeds if any channel succeeds.
type FanoutNotifier struct {
	channels []Notifier
}

func NewFanoutNotifier(channels ...Notifier) *FanoutNotifier {
	out := make([]Notifier, 0, len(channels))
	for _, ch := range channels {
		if ch != nil {
			out = append(out, ch)
		}
	}
	return &FanoutNotifier{channels: out}
}

func (f *FanoutNotifier) Notify(ctx context.Context, ev Event) error {
	if f == nil || len(f.channels) == 0 {
		return nil
	}
	var lastErr error
	ok := 0
	for _, ch := range f.channels {
		if err := ch.Notify(ctx, ev); err != nil {
			lastErr = err
			continue
		}
		ok++
	}
	if ok > 0 {
		return nil
	}
	return lastErr
}
