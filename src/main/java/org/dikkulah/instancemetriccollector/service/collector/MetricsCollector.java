package org.dikkulah.instancemetriccollector.service.collector;

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

    String getNetworkUsage();

    String getDiskUsage();
}
