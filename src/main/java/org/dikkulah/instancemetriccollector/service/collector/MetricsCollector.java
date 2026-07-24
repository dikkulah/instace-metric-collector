package org.dikkulah.instancemetriccollector.service.collector;

import org.dikkulah.instancemetriccollector.model.DiskUsageInfo;
import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;

import java.util.List;

public interface MetricsCollector extends ProcessCollector, ServiceCollector {

    String getOSName();

    String getOSVersion();

    double getCpuLoad();

    long getTotalMemorySize();

    long getFreeMemorySize();

    double getProcessCpuLoad();

    long getCommittedVirtualMemorySize();

    long getProcessCpuTime();

    double getSystemLoadAverage();

    long getTotalSwapSpaceSize();

    int getAvailableProcessors();

    long getFreeSwapSpaceSize();

    String getCollectorName();

    List<DiskUsageInfo> getDiskUsage();

    List<NetworkUsageInfo> getNetworkUsage();
}
