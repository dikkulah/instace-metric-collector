package org.dikkulah.instancemetriccollector.service.collector.windows;

import org.dikkulah.instancemetriccollector.config.OperatingSystemCondition;
import org.dikkulah.instancemetriccollector.model.DiskUsageInfo;
import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;
import org.dikkulah.instancemetriccollector.model.OperatingSystem;
import org.dikkulah.instancemetriccollector.model.ProcessInfo;
import org.dikkulah.instancemetriccollector.model.ServiceInfo;
import org.dikkulah.instancemetriccollector.service.collector.AbstractMetricsCollector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Collections;
import java.util.List;

@Component
@Conditional(OperatingSystemCondition.Windows.class)
public class WindowsMetricsCollector extends AbstractMetricsCollector {

    private static final Logger log = LoggerFactory.getLogger(WindowsMetricsCollector.class);

    private final WindowsServiceCollector windowsServiceCollector;
    private final WindowsProcessCollector windowsProcessCollector;

    public WindowsMetricsCollector(WindowsServiceCollector windowsServiceCollector, WindowsProcessCollector windowsProcessCollector) {
        this.windowsServiceCollector = windowsServiceCollector;
        this.windowsProcessCollector = windowsProcessCollector;
    }

    @Override
    public List<NetworkUsageInfo> getNetworkUsage() {
        try {
            Process process = new ProcessBuilder(
                    "powershell",
                    "-NoProfile",
                    "-Command",
                    "Get-NetAdapterStatistics | Select-Object Name,ReceivedBytes,SentBytes | ConvertTo-Csv -NoTypeInformation"
            ).start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append('\n');
                }
                return WindowsNetworkUsageParser.parsePowerShellOutput(sb.toString());
            }
        } catch (Exception e) {
            log.error("Error getting network usage", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<DiskUsageInfo> getDiskUsage() {
        try {
            Process process = new ProcessBuilder(
                    "wmic",
                    "logicaldisk",
                    "where",
                    "drivetype=3",
                    "get",
                    "DeviceID,FreeSpace,Size",
                    "/format:csv"
            ).start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append('\n');
                }
                return WindowsDiskUsageParser.parseWmicOutput(sb.toString());
            }
        } catch (Exception e) {
            log.error("Error getting disk usage", e);
            return Collections.emptyList();
        }
    }

    @Override
    public String getCollectorName() {
        return OperatingSystem.WINDOWS.getOsName();
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
