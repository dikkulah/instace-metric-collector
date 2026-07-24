package org.dikkulah.instancemetriccollector.hub;

import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class HubAgentRegistryTest {

    private HubAgentRegistry registry;

    @BeforeEach
    void setUp() {
        HubProperties properties = new HubProperties();
        properties.setHistorySize(2);
        registry = new HubAgentRegistry(properties);
    }

    @Test
    void ingestStoresLatestAndHistory() {
        MetricsPayload first = samplePayload(0.1, 100);
        MetricsPayload second = samplePayload(0.2, 200);
        MetricsPayload third = samplePayload(0.3, 300);

        registry.ingest("agent-1", "host-a", first);
        registry.ingest("agent-1", "host-a", second);
        registry.ingest("agent-1", "host-a", third);

        assertEquals(0.3, registry.getLatest("agent-1").payload().cpuLoad());
        assertEquals(2, registry.getHistory("agent-1", 10).size());
        assertEquals(1, registry.listAgents().size());
        assertEquals("host-a", registry.listAgents().getFirst().hostname());
    }

    @Test
    void ingestTracksMultipleAgents() {
        registry.ingest("a1", "h1", samplePayload(0.5, 500));
        registry.ingest("a2", "h2", samplePayload(0.6, 600));

        assertEquals(2, registry.listAgents().size());
        assertNotNull(registry.getLatest("a2"));
    }

    private static MetricsPayload samplePayload(double cpu, long usedMemory) {
        return new MetricsPayload(cpu, usedMemory, 1000L, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0);
    }
}
