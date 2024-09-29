package org.dikkulah.instancemetriccollector.service.collector.windows;

import org.dikkulah.instancemetriccollector.config.OperatingSystemCondition;
import org.dikkulah.instancemetriccollector.model.OperatingSystem;
import org.dikkulah.instancemetriccollector.model.ProcessInfo;
import org.dikkulah.instancemetriccollector.model.ServiceInfo;
import org.dikkulah.instancemetriccollector.service.collector.AbstractMetricsCollector;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Conditional(OperatingSystemCondition.Windows.class)
public class WindowsMetricsCollector extends AbstractMetricsCollector {

    private final WindowsServiceCollector windowsServiceCollector;
    private final WindowsProcessCollector windowsProcessCollector;

    public WindowsMetricsCollector(WindowsServiceCollector windowsServiceCollector, WindowsProcessCollector windowsProcessCollector) {
        this.windowsServiceCollector = windowsServiceCollector;
        this.windowsProcessCollector = windowsProcessCollector;
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
        return "windows";
    }

    @Override
    public List<ServiceInfo> getRunningServices() {
        return windowsServiceCollector.getRunningServices();
    }

    @Override
    public List<ProcessInfo> getRunningProcesses() {
        return windowsProcessCollector.getRunningProcesses();
    }
}
