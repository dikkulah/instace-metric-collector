package org.dikkulah.instancemetriccollector.model;

public record NetworkUsageInfo(
        String name,
        long bytesReceived,
        long bytesSent) {
}
