package org.dikkulah.instancemetriccollector.hub;

import java.time.Instant;
import java.util.Map;

public record AlertEvent(
        String agentId,
        String alertType,
        String message,
        Instant collectedAt,
        Map<String, Object> details) {
}
