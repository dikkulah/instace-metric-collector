package org.dikkulah.instancemetriccollector.model;

import java.util.List;

public record MetricsPayload(double cpuLoad,
                             long usedMemory,
                             long totalMemory,
                             List<ProcessInfo> processInfos,
                             List<ServiceInfo> serviceInfos,
                             List<ContainerInfo> containers,
                             List<DiskUsageInfo> diskUsage,
                             List<NetworkUsageInfo> networkUsage,
                             int availableProcessors,
                             double systemLoadAverage) {

}
