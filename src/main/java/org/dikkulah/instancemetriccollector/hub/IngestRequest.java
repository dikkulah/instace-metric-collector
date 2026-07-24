package org.dikkulah.instancemetriccollector.hub;

import org.dikkulah.instancemetriccollector.model.MetricsPayload;

public record IngestRequest(String agentId, String hostname, MetricsPayload payload) {
}
