package org.dikkulah.instancemetriccollector.web;

import org.dikkulah.instancemetriccollector.model.MetricsPayload;

import java.time.Instant;

public record MetricsSnapshot(Instant collectedAt, MetricsPayload payload) {
}
