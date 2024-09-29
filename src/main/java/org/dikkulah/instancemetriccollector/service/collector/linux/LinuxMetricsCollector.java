package org.dikkulah.instancemetriccollector.service.collector.linux;

import org.dikkulah.instancemetriccollector.config.OperatingSystemCondition;
import org.dikkulah.instancemetriccollector.model.OperatingSystem;
import org.dikkulah.instancemetriccollector.model.ProcessInfo;
import org.dikkulah.instancemetriccollector.model.ServiceInfo;
import org.dikkulah.instancemetriccollector.service.collector.AbstractMetricsCollector;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Conditional(OperatingSystemCondition.Linux.class)
public class LinuxMetricsCollector extends AbstractMetricsCollector {

    private final LinuxServiceCollector linuxServiceCollector;
    private final LinuxProcessCollector linuxProcessCollector;

    public LinuxMetricsCollector(LinuxServiceCollector linuxServiceCollector, LinuxProcessCollector linuxProcessCollector) {
        this.linuxServiceCollector = linuxServiceCollector;
        this.linuxProcessCollector = linuxProcessCollector;
    }

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
        return "linux";
    }

    @Override
    public List<ServiceInfo> getRunningServices() {
        return linuxServiceCollector.getRunningServices();
    }

    @Override
    public List<ProcessInfo> getRunningProcesses() {
        return linuxProcessCollector.getRunningProcesses();
    }

}
