package org.dikkulah.instancemetriccollector.service.collector;

import com.sun.management.OperatingSystemMXBean;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;

@Service
public abstract class InstanceMetricsCollector implements MetricsCollector {

    private final OperatingSystemMXBean osBean;

    public InstanceMetricsCollector() {
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

    public abstract String getNetworkUsage();

    public abstract String getDiskUsage();
}