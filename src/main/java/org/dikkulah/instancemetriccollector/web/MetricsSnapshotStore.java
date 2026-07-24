package org.dikkulah.instancemetriccollector.web;

import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

@Component
@ConditionalOnProperty(name = "metrics.ui.enabled", havingValue = "true", matchIfMissing = true)
public class MetricsSnapshotStore {

    private final int maxHistory;
    private final List<MetricsSnapshot> history = new ArrayList<>();
    private volatile MetricsSnapshot latest;
    private final CopyOnWriteArrayList<Consumer<MetricsSnapshot>> listeners = new CopyOnWriteArrayList<>();

    public MetricsSnapshotStore(MetricsUiProperties properties) {
        this.maxHistory = Math.max(1, properties.getHistorySize());
    }

    public synchronized void save(MetricsPayload payload) {
        MetricsSnapshot snapshot = new MetricsSnapshot(Instant.now(), payload);
        latest = snapshot;
        history.add(snapshot);
        while (history.size() > maxHistory) {
            history.removeFirst();
        }
        listeners.forEach(listener -> listener.accept(snapshot));
    }

    public MetricsSnapshot getLatest() {
        return latest;
    }

    public synchronized List<MetricsSnapshot> getHistory(int limit) {
        int size = history.size();
        if (size == 0) {
            return List.of();
        }
        int from = Math.max(0, size - limit);
        return List.copyOf(history.subList(from, size));
    }

    public void addListener(Consumer<MetricsSnapshot> listener) {
        listeners.add(listener);
    }

    public void removeListener(Consumer<MetricsSnapshot> listener) {
        listeners.remove(listener);
    }
}
