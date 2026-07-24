package org.dikkulah.instancemetriccollector.web;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/metrics")
@ConditionalOnProperty(name = "metrics.ui.enabled", havingValue = "true", matchIfMissing = true)
public class MetricsController {

    private final MetricsSnapshotStore store;
    private final MetricsUiProperties properties;
    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public MetricsController(MetricsSnapshotStore store, MetricsUiProperties properties) {
        this.store = store;
        this.properties = properties;
        store.addListener(this::broadcast);
    }

    @GetMapping("/current")
    public ResponseEntity<MetricsSnapshot> current() {
        MetricsSnapshot latest = store.getLatest();
        if (latest == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(latest);
    }

    @GetMapping("/history")
    public List<MetricsSnapshot> history(@RequestParam(defaultValue = "60") int limit) {
        int capped = Math.min(Math.max(limit, 1), properties.getHistorySize());
        return store.getHistory(capped);
    }

    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);

        MetricsSnapshot latest = store.getLatest();
        if (latest != null) {
            try {
                emitter.send(SseEmitter.event().name("metrics").data(latest));
            } catch (IOException ignored) {
                emitters.remove(emitter);
            }
        }

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(ex -> emitters.remove(emitter));
        return emitter;
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of(
                "defaultLocale", properties.getDefaultLocale(),
                "locales", properties.getLocales(),
                "refreshInterval", properties.getRefreshInterval(),
                "historySize", properties.getHistorySize()
        );
    }

    private void broadcast(MetricsSnapshot snapshot) {
        List<SseEmitter> dead = new java.util.ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("metrics").data(snapshot));
            } catch (Exception ex) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
    }
}
