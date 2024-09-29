package org.dikkulah.instancemetriccollector.dto;

import java.util.List;

public record MetricsPayload(double cpuLoad,
                             long usedMemory,
                             long totalMemory,
                             List<ProcessInfo> processInfos,
                             List<ServiceInfo> serviceInfos) {

}
