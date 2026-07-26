package alert

import (
	"context"
)

// PersistingNotifier wraps a notifier and records successful alerts to history.
type PersistingNotifier struct {
	inner   Notifier
	onSent  func(Event)
}

func NewPersistingNotifier(inner Notifier, onSent func(Event)) *PersistingNotifier {
	return &PersistingNotifier{inner: inner, onSent: onSent}
}

func (p *PersistingNotifier) Notify(ctx context.Context, ev Event) error {
	if p == nil || p.inner == nil {
		return nil
	}
	if err := p.inner.Notify(ctx, ev); err != nil {
		return err
	}
	if p.onSent != nil {
		p.onSent(ev)
	}
	return nil
}
