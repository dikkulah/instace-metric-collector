package org.dikkulah.instancemetriccollector.service.collector;

import com.sun.management.OperatingSystemMXBean;

import java.lang.management.ManagementFactory;

public abstract class AbstractMetricsCollector implements MetricsCollector {

    private final OperatingSystemMXBean osBean;

    protected AbstractMetricsCollector() {
        this.osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
    }

    @Override
    public double getCpuLoad() {
        return osBean.getCpuLoad();
    }

    @Override
    public long getTotalMemorySize() {
        return osBean.getTotalMemorySize();
    }

    @Override
    public long getFreeMemorySize() {
        return osBean.getFreeMemorySize();
    }

    @Override
    public double getProcessCpuLoad() {
        return osBean.getProcessCpuLoad();
    }

    @Override
    public long getCommittedVirtualMemorySize() {
        return osBean.getCommittedVirtualMemorySize();
    }

    @Override
    public long getProcessCpuTime() {
        return osBean.getProcessCpuTime();
    }

    @Override
    public double getSystemLoadAverage() {
        return osBean.getSystemLoadAverage();
    }

    @Override
    public long getTotalSwapSpaceSize() {
        return osBean.getTotalSwapSpaceSize();
    }

    @Override
    public int getAvailableProcessors() {
        return osBean.getAvailableProcessors();
    }

    @Override
    public long getFreeSwapSpaceSize() {
        return osBean.getFreeSwapSpaceSize();
    }

    @Override
    public String getOSName() {
        return osBean.getName();
    }

    @Override
    public String getOSVersion() {
        return osBean.getVersion();
    }

}