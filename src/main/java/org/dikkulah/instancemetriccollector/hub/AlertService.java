package org.dikkulah.instancemetriccollector.hub;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.dikkulah.instancemetriccollector.model.ContainerInfo;
import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.dikkulah.instancemetriccollector.web.MetricsSnapshot;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@ConditionalOnProperty(name = "metrics.hub.enabled", havingValue = "true")
public class AlertService {

    private static final Log log = LogFactory.getLog(AlertService.class);

    private final AlertProperties properties;
    private final RestTemplate restTemplate;
    private final Map<String, Instant> lastFired = new ConcurrentHashMap<>();

    public AlertService(AlertProperties properties, RestTemplate restTemplate) {
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    public void evaluate(String agentId, MetricsSnapshot snapshot) {
        if (!properties.isEnabled() || properties.getWebhookUrl().isBlank()) {
            return;
        }
        MetricsPayload payload = snapshot.payload();
        List<AlertEvent> events = new ArrayList<>();

        if (payload.cpuLoad() >= properties.getCpuThreshold()) {
            events.add(new AlertEvent(
                    agentId,
                    "CPU_HIGH",
                    "CPU load above threshold",
                    snapshot.collectedAt(),
                    Map.of("cpuLoad", payload.cpuLoad(), "threshold", properties.getCpuThreshold())));
        }

        if (payload.totalMemory() > 0) {
            double memoryRatio = (double) payload.usedMemory() / payload.totalMemory();
            if (memoryRatio >= properties.getMemoryThreshold()) {
                events.add(new AlertEvent(
                        agentId,
                        "MEMORY_HIGH",
                        "Memory usage above threshold",
                        snapshot.collectedAt(),
                        Map.of("memoryRatio", memoryRatio, "threshold", properties.getMemoryThreshold())));
            }
        }

        if (payload.containers() != null) {
            for (ContainerInfo container : payload.containers()) {
                if (container.status() != null && container.status().toLowerCase().contains("exit")) {
                    events.add(new AlertEvent(
                            agentId,
                            "CONTAINER_EXITED",
                            "Container exited: " + container.name(),
                            snapshot.collectedAt(),
                            Map.of("container", container.name(), "status", container.status())));
                }
                if ("unhealthy".equalsIgnoreCase(container.health())) {
                    events.add(new AlertEvent(
                            agentId,
                            "CONTAINER_UNHEALTHY",
                            "Container unhealthy: " + container.name(),
                            snapshot.collectedAt(),
                            Map.of("container", container.name(), "health", container.health())));
                }
            }
        }

        for (AlertEvent event : events) {
            if (shouldFire(agentId, event.alertType())) {
                sendWebhook(event);
            }
        }
    }

    private boolean shouldFire(String agentId, String alertType) {
        String key = agentId + ":" + alertType;
        Instant now = Instant.now();
        Instant last = lastFired.get(key);
        if (last != null && now.isBefore(last.plusSeconds(properties.getCooldownSeconds()))) {
            return false;
        }
        lastFired.put(key, now);
        return true;
    }

    private void sendWebhook(AlertEvent event) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("agentId", event.agentId());
            body.put("alertType", event.alertType());
            body.put("message", event.message());
            body.put("collectedAt", event.collectedAt().toString());
            body.put("details", event.details());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(properties.getWebhookUrl(), new HttpEntity<>(body, headers), Void.class);
            log.warn("Alert fired: " + event.alertType() + " for agent " + event.agentId());
        } catch (Exception ex) {
            log.error("Failed to send alert webhook for agent " + event.agentId(), ex);
        }
    }
}
