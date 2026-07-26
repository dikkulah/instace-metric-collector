package alert

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

const defaultQueueSize = 64
const defaultNotifyRetries = 3

// StatsRecorder records alert dispatch outcomes (optional).
type StatsRecorder interface {
	RecordAlertOK()
	RecordAlertFailed()
}

// Engine evaluates rules on ingest and dispatches alerts asynchronously with cooldown dedup.
type Engine struct {
	rules    []Rule
	notifier Notifier
	cfg      *ConfigStore
	silences *SilenceStore
	logger   *slog.Logger
	stats    StatsRecorder
	maxRetry int
	sustained       *SustainedTracker
	sustainedWindow time.Duration

	queue chan Event

	mu       sync.Mutex
	lastSent map[string]time.Time

	pendingMu sync.Mutex
	pending   []Event

	resolver OpenAlertResolver
}

func NewEngine(rules []Rule, notifier Notifier, cfg *ConfigStore, logger *slog.Logger) *Engine {
	return &Engine{
		rules:    rules,
		notifier: notifier,
		cfg:      cfg,
		logger:   logger,
		maxRetry: defaultNotifyRetries,
		lastSent: make(map[string]time.Time),
		queue:    make(chan Event, defaultQueueSize),
		sustained: NewSustainedTracker(),
	}
}

// SetSustainedWindow configures avg-over-window alerting for CPU/memory (0 = instant).
func (e *Engine) SetSustainedWindow(d time.Duration) {
	if e != nil {
		e.sustainedWindow = d
	}
}

// SetNotifier replaces the outbound notifier (hot reload after notification config change).
func (e *Engine) SetNotifier(n Notifier) {
	if e != nil {
		e.notifier = n
	}
}

// SetResolver wires auto-resolve for cleared alert conditions (optional).
func (e *Engine) SetResolver(r OpenAlertResolver) {
	if e != nil {
		e.resolver = r
	}
}

// SetStats wires hub stats counters.
func (e *Engine) SetStats(s StatsRecorder) {
	if e != nil {
		e.stats = s
	}
}

// SetSilences wires the hub silence store (optional).
func (e *Engine) SetSilences(s *SilenceStore) {
	if e != nil {
		e.silences = s
	}
}

// Run starts the async dispatch worker. Call as a goroutine.
func (e *Engine) Run(ctx context.Context) {
	if e == nil {
		return
	}
	for {
		select {
		case <-ctx.Done():
			return
		case ev := <-e.queue:
			e.deliver(ev)
		}
	}
}

// OnIngest enqueues alert events after rule evaluation (non-blocking).
func (e *Engine) OnIngest(agentID, hostname string, snap payload.Snapshot) {
	if e == nil || e.notifier == nil {
		return
	}
	now := time.Now().UTC()
	if e.sustained != nil && e.sustainedWindow > 0 {
		e.sustained.Record(agentID, sustainedMetricCPU, snap.Payload.CPULoad, now)
		if snap.Payload.TotalMemory > 0 {
			ratio := float64(snap.Payload.UsedMemory) / float64(snap.Payload.TotalMemory)
			e.sustained.Record(agentID, sustainedMetricMemory, ratio, now)
		}
	}
	ctx := EvalContext{
		AgentID:         agentID,
		Hostname:        hostname,
		Snapshot:        snap,
		LastSeen:        now,
		Sustained:       e.sustained,
		SustainedWindow: e.sustainedWindow,
		Now:             now,
	}
	firing := make(map[string]bool)
	for _, rule := range e.rules {
		if _, ok := rule.(*AgentStaleRule); ok {
			continue
		}
		for _, ev := range rule.Evaluate(ctx) {
			firing[ev.AlertType] = true
			e.enqueue(ev)
		}
	}
	e.autoResolve(ctx, firing)
}

// RunStaleChecker periodically evaluates AGENT_STALE for agents that stopped pushing.
func (e *Engine) RunStaleChecker(ctx context.Context, interval time.Duration, collectionInterval time.Duration, agents func() []AgentSeen) {
	if e == nil || interval <= 0 || collectionInterval <= 0 || e.cfg == nil {
		return
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			staleAfter := e.cfg.StaleAfter(collectionInterval)
			now := time.Now().UTC()
			for _, a := range agents() {
				if now.Sub(a.LastSeen) <= staleAfter {
					continue
				}
				for _, rule := range e.rules {
					staleRule, ok := rule.(*AgentStaleRule)
					if !ok {
						continue
					}
					for _, ev := range staleRule.EvaluateStale(a.AgentID, a.Hostname, a.LastSeen, staleAfter) {
						e.enqueue(ev)
					}
				}
			}
		}
	}
}

func (e *Engine) enqueue(ev Event) {
	select {
	case e.queue <- ev:
	default:
		select {
		case dropped := <-e.queue:
			if e.logger != nil {
				e.logger.Warn("alert queue full, dropping oldest", "type", dropped.AlertType)
			}
		default:
		}
		select {
		case e.queue <- ev:
		default:
		}
	}
}

func (e *Engine) deliver(ev Event) {
	if e.silences != nil && e.silences.IsSilenced(ev.AgentID, ev.AlertType) {
		if e.logger != nil {
			e.logger.Debug("alert silenced", "agentId", ev.AgentID, "type", ev.AlertType)
		}
		return
	}
	ev = WithNotifyDefaults(ev)
	key := ev.AgentID + "|" + ev.AlertType
	now := time.Now().UTC()
	cooldown := 10 * time.Minute
	if e.cfg != nil {
		cooldown = e.cfg.Cooldown()
	}

	e.mu.Lock()
	if last, ok := e.lastSent[key]; ok && now.Sub(last) < cooldown {
		e.mu.Unlock()
		return
	}
	e.mu.Unlock()

	for attempt := 0; attempt < e.maxRetry; attempt++ {
		if attempt > 0 {
			time.Sleep(notifyBackoff(attempt))
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		err := e.notifier.Notify(ctx, ev)
		cancel()
		if err == nil {
			e.mu.Lock()
			e.lastSent[key] = time.Now().UTC()
			e.mu.Unlock()
			if e.stats != nil {
				e.stats.RecordAlertOK()
			}
			if e.logger != nil {
				e.logger.Info("alert sent", "agentId", ev.AgentID, "type", ev.AlertType, "severity", ev.Severity)
			}
			return
		}
		if e.logger != nil {
			e.logger.Warn("alert notify failed", "agentId", ev.AgentID, "type", ev.AlertType, "attempt", attempt+1, "err", err)
		}
	}

	if e.stats != nil {
		e.stats.RecordAlertFailed()
	}
	e.recordPending(ev)
}

func (e *Engine) autoResolve(ctx EvalContext, firing map[string]bool) {
	if e.resolver == nil {
		return
	}
	if !firing[AlertTypeCPUHigh] && cpuHighCleared(e.rules, ctx) {
		e.resolveCleared(ctx.AgentID, AlertTypeCPUHigh)
	}
	if !firing[AlertTypeMemoryHigh] && memoryHighCleared(e.rules, ctx) {
		e.resolveCleared(ctx.AgentID, AlertTypeMemoryHigh)
	}
	if !firing[AlertTypeDiskHigh] {
		e.resolveCleared(ctx.AgentID, AlertTypeDiskHigh)
	}
	if !firing[AlertTypeContainerExited] {
		e.resolveCleared(ctx.AgentID, AlertTypeContainerExited)
	}
	if !firing[AlertTypeContainerUnhealthy] {
		e.resolveCleared(ctx.AgentID, AlertTypeContainerUnhealthy)
	}
	e.resolveCleared(ctx.AgentID, AlertTypeAgentStale)
}

func (e *Engine) resolveCleared(agentID, alertType string) {
	n, err := e.resolver.ResolveOpenAlerts(agentID, alertType)
	if err != nil || n == 0 {
		return
	}
	e.mu.Lock()
	delete(e.lastSent, agentID+"|"+alertType)
	e.mu.Unlock()
	if e.logger != nil {
		e.logger.Info("alert resolved", "agentId", agentID, "type", alertType, "count", n)
	}
}

func cpuHighCleared(rules []Rule, ctx EvalContext) bool {
	for _, rule := range rules {
		if r, ok := rule.(*CPUHighRule); ok {
			return r.Cleared(ctx)
		}
	}
	return true
}

func memoryHighCleared(rules []Rule, ctx EvalContext) bool {
	for _, rule := range rules {
		if r, ok := rule.(*MemoryHighRule); ok {
			return r.Cleared(ctx)
		}
	}
	return true
}

func (e *Engine) recordPending(ev Event) {
	e.pendingMu.Lock()
	defer e.pendingMu.Unlock()
	const cap = 100
	if len(e.pending) >= cap {
		e.pending = e.pending[1:]
	}
	e.pending = append(e.pending, ev)
}

// Pending returns a copy of failed alerts (for stats/debug).
func (e *Engine) Pending() []Event {
	e.pendingMu.Lock()
	defer e.pendingMu.Unlock()
	out := make([]Event, len(e.pending))
	copy(out, e.pending)
	return out
}

// ResetCooldown clears dedup state (for tests).
func (e *Engine) ResetCooldown() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.lastSent = make(map[string]time.Time)
}

func notifyBackoff(attempt int) time.Duration {
	d := time.Second << (attempt - 1)
	if d > 30*time.Second {
		d = 30 * time.Second
	}
	return d
}
