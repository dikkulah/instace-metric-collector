package org.dikkulah.instancemetriccollector.model;

public record ServiceInfo(
        String serviceName,
        ServiceStatus status,
        String description) {
}