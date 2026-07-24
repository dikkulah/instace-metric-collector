package org.dikkulah.instancemetriccollector.hub;

import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.dikkulah.instancemetriccollector.web.MetricsSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private AlertProperties properties;
    private AlertService alertService;

    @BeforeEach
    void setUp() {
        properties = new AlertProperties();
        properties.setEnabled(true);
        properties.setWebhookUrl("http://hooks.example/alerts");
        properties.setCpuThreshold(0.80);
        properties.setMemoryThreshold(0.90);
        properties.setCooldownSeconds(300);
        alertService = new AlertService(properties, restTemplate);
    }

    @Test
    void evaluate_firesCpuAlert() {
        doReturn(ResponseEntity.accepted().build())
                .when(restTemplate).postForEntity(anyString(), any(), eq(Void.class));

        MetricsPayload payload = new MetricsPayload(
                0.95, 500, 1000, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0);
        MetricsSnapshot snapshot = new MetricsSnapshot(Instant.now(), payload);

        alertService.evaluate("agent-1", snapshot);

        ArgumentCaptor<HttpEntity<Map<String, Object>>> bodyCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(eq(properties.getWebhookUrl()), bodyCaptor.capture(), eq(Void.class));
        assertEquals("CPU_HIGH", bodyCaptor.getValue().getBody().get("alertType"));
    }

    @Test
    void evaluate_respectsCooldown() {
        doReturn(ResponseEntity.accepted().build())
                .when(restTemplate).postForEntity(anyString(), any(), eq(Void.class));

        MetricsPayload payload = new MetricsPayload(
                0.95, 500, 1000, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0);
        MetricsSnapshot snapshot = new MetricsSnapshot(Instant.now(), payload);

        alertService.evaluate("agent-1", snapshot);
        alertService.evaluate("agent-1", snapshot);

        verify(restTemplate, times(1)).postForEntity(anyString(), any(HttpEntity.class), eq(Void.class));
    }

    @Test
    void evaluate_skipsWhenWebhookDisabled() {
        properties.setWebhookUrl("");
        MetricsPayload payload = new MetricsPayload(
                0.95, 500, 1000, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0);
        alertService.evaluate("agent-1", new MetricsSnapshot(Instant.now(), payload));
        verifyNoInteractions(restTemplate);
    }
}
