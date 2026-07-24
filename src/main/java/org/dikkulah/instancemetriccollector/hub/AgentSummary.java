package org.dikkulah.instancemetriccollector.hub;

import java.time.Instant;

public record AgentSummary(
        String agentId,
        String hostname,
        Instant lastSeen,
        double cpuLoad,
        long usedMemory,
        long totalMemory,
        int containerCount) {
}
