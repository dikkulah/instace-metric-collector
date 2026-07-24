package org.dikkulah.instancemetriccollector.hub;

import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class HubLocalIngestServiceTest {

    @Mock
    private AlertService alertService;

    private HubAgentRegistry registry;
    private HubLocalIngestService localIngest;

    @BeforeEach
    void setUp() {
        HubProperties hubProperties = new HubProperties();
        hubProperties.setHistorySize(10);
        registry = new HubAgentRegistry(hubProperties);

        MetricsPushProperties pushProperties = new MetricsPushProperties();
        pushProperties.setAgentId("test-agent");
        localIngest = new HubLocalIngestService(registry, alertService, pushProperties);
    }

    @Test
    void ingestLocalRegistersAgent() {
        MetricsPayload payload = new MetricsPayload(
                0.5, 100, 1000, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0);

        localIngest.ingestLocal(payload);

        assertEquals(1, registry.listAgents().size());
        assertEquals("test-agent", registry.listAgents().getFirst().agentId());
        verify(alertService).evaluate(org.mockito.ArgumentMatchers.eq("test-agent"),
                org.mockito.ArgumentMatchers.any());
    }
}
