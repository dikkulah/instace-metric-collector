package org.dikkulah.instancemetriccollector.hub;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MetricsPushServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @Test
    void pushPostsIngestRequest() {
        MetricsPushProperties properties = new MetricsPushProperties();
        properties.setIngestUrl("http://hub.example/api/v1/ingest");
        properties.setAgentId("test-agent");
        properties.setAuthToken("secret");
        MetricsPushService pushService = new MetricsPushService(properties, restTemplate);

        doReturn(ResponseEntity.accepted().build())
                .when(restTemplate).postForEntity(anyString(), any(HttpEntity.class), eq(Void.class));

        MetricsPayload payload = new MetricsPayload(
                0.5, 100, 1000, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0);
        pushService.push(payload);

        ArgumentCaptor<HttpEntity<IngestRequest>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(eq(properties.getIngestUrl()), captor.capture(), eq(Void.class));
        IngestRequest body = captor.getValue().getBody();
        assertEquals("test-agent", body.agentId());
        assertEquals(0.5, body.payload().cpuLoad());
    }
}
