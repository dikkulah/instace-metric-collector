package org.dikkulah.instancemetriccollector.service.collector.linux;

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
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;

@Component
@Conditional(OperatingSystemCondition.Linux.class)
public class LinuxMetricsCollector extends AbstractMetricsCollector {

    private static final Logger log = LoggerFactory.getLogger(LinuxMetricsCollector.class);

    private final LinuxServiceCollector linuxServiceCollector;
    private final LinuxProcessCollector linuxProcessCollector;

    public LinuxMetricsCollector(LinuxServiceCollector linuxServiceCollector, LinuxProcessCollector linuxProcessCollector) {
        this.linuxServiceCollector = linuxServiceCollector;
        this.linuxProcessCollector = linuxProcessCollector;
    }

    @Override
    public List<NetworkUsageInfo> getNetworkUsage() {
        try {
            String content = Files.readString(Path.of("/proc/net/dev"));
            return LinuxNetworkUsageParser.parseProcNetDev(content);
        } catch (Exception e) {
            log.error("Error getting network usage", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<DiskUsageInfo> getDiskUsage() {
        try {
            Process process = new ProcessBuilder("df", "-B1", "-P").start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append('\n');
                }
                return LinuxDiskUsageParser.parseDfOutput(sb.toString());
            }
        } catch (Exception e) {
            log.error("Error getting disk usage", e);
            return Collections.emptyList();
        }
    }

    @Override
    public String getCollectorName() {
        return OperatingSystem.LINUX.getOsName();
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
