package org.dikkulah.instancemetriccollector.service.collector.mac;

import org.dikkulah.instancemetriccollector.config.OperatingSystemCondition;
import org.dikkulah.instancemetriccollector.model.DiskUsageInfo;
import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;
import org.dikkulah.instancemetriccollector.model.OperatingSystem;
import org.dikkulah.instancemetriccollector.model.ProcessInfo;
import org.dikkulah.instancemetriccollector.model.ServiceInfo;
import org.dikkulah.instancemetriccollector.model.ServiceStatus;
import org.dikkulah.instancemetriccollector.service.collector.AbstractMetricsCollector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
@Conditional(OperatingSystemCondition.Mac.class)
public class MacMetricsCollector extends AbstractMetricsCollector {
    private static final Logger log = LoggerFactory.getLogger(MacProcessCollector.class);

    @Override
    public String getCollectorName() {
        return OperatingSystem.MAC.getOsName();
    }

    @Override
    public List<DiskUsageInfo> getDiskUsage() {
        try {
            Process process = new ProcessBuilder("df", "-k").start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append('\n');
                }
                return MacDiskUsageParser.parseDfOutput(sb.toString());
            }
        } catch (Exception e) {
            log.error("Error getting disk usage", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<NetworkUsageInfo> getNetworkUsage() {
        try {
            Process process = new ProcessBuilder("netstat", "-ib").start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append('\n');
                }
                return MacNetworkUsageParser.parseNetstatOutput(sb.toString());
            }
        } catch (Exception e) {
            log.error("Error getting network usage", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ProcessInfo> getRunningProcesses() {
        List<ProcessInfo> processes = new ArrayList<>();
        try {
            Process process = new ProcessBuilder("ps", "aux").start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            boolean header = true;
            while ((line = reader.readLine()) != null) {
                if (header) {
                    header = false;
                    continue;
                }
                ProcessInfo info = parseProcessLine(line);
                if (info != null) {
                    processes.add(info);
                }
            }
        } catch (Exception e) {
            log.error("Error getting process list", e);
        }
        return processes;
    }
    
    private ProcessInfo parseProcessLine(String line) {
        try {
            String[] columns = line.trim().split("\\s+", 11);
            if (columns.length < 11) {
                return null;
            }
            String user = columns[0];
            int pid = Integer.parseInt(columns[1]);
            double cpuUsage = Double.parseDouble(columns[2]);
            double memoryUsage = Double.parseDouble(columns[3]);
            String command = columns[10];
            return new ProcessInfo(user, pid, cpuUsage, memoryUsage, command);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public List<ServiceInfo> getRunningServices() {
        List<ServiceInfo> services = new ArrayList<>();
        try {
            Process process = new ProcessBuilder("launchctl", "list").start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            boolean header = true;
            while ((line = reader.readLine()) != null) {
                if (header) {
                    header = false;
                    continue;
                }
                // Çok basit bir parse: üçüncü sütun genellikle service adıdır.
                String[] parts = line.trim().split("\\s+", 3);
                services.add(new ServiceInfo(parts[2], ServiceStatus.fromStatusCode(Integer.parseInt(parts[1])), ""));
            }
        } catch (Exception e) {
            log.error("Error getting running services", e);
        }
        return services;
    }
}