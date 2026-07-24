package org.dikkulah.instancemetriccollector.web;

import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class MetricsSnapshotStoreTest {

    private MetricsSnapshotStore store;

    @BeforeEach
    void setUp() {
        MetricsUiProperties properties = new MetricsUiProperties();
        properties.setHistorySize(3);
        store = new MetricsSnapshotStore(properties);
    }

    @Test
    void saveAndGetLatest() {
        MetricsPayload payload = samplePayload(10);
        store.save(payload);

        MetricsSnapshot latest = store.getLatest();
        assertNotNull(latest);
        assertEquals(10, latest.payload().usedMemory());
    }

    @Test
    void ringBufferEvictsOldest() {
        store.save(samplePayload(1));
        store.save(samplePayload(2));
        store.save(samplePayload(3));
        store.save(samplePayload(4));

        List<MetricsSnapshot> history = store.getHistory(10);
        assertEquals(3, history.size());
        assertEquals(2, history.getFirst().payload().usedMemory());
        assertEquals(4, history.getLast().payload().usedMemory());
    }

    @Test
    void notifiesListeners() {
        AtomicInteger count = new AtomicInteger();
        store.addListener(s -> count.incrementAndGet());

        store.save(samplePayload(1));
        store.save(samplePayload(2));

        assertEquals(2, count.get());
    }

    private static MetricsPayload samplePayload(long usedMemory) {
        return new MetricsPayload(0.5, usedMemory, 1000L, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0);
    }
}
