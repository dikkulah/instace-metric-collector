package org.dikkulah.instancemetriccollector.model;

public record DiskUsageInfo(
        String mount,
        String filesystem,
        long totalBytes,
        long usedBytes,
        double usePercent) {
}
