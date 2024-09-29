package org.dikkulah.instancemetriccollector.service.collector;

import org.springframework.stereotype.Component;

@Component
public class WindowsMetricsCollector extends InstanceMetricsCollector {
    @Override
    public String getNetworkUsage() {
        return "";
    }

    @Override
    public String getDiskUsage() {
        return "";
    }

    @Override
    public String getCollectorName() {
        return "windows";
    }
}
