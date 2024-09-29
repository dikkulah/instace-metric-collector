package org.dikkulah.instancemetriccollector.service.collector.linux;

import org.dikkulah.instancemetriccollector.config.OperatingSystemCondition;
import org.dikkulah.instancemetriccollector.dto.ServiceInfo;
import org.dikkulah.instancemetriccollector.service.collector.ServiceCollector;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@Component
@Conditional(OperatingSystemCondition.Linux.class)
public class LinuxServiceCollector implements ServiceCollector {
    private final ProcessBuilder processBuilder = new ProcessBuilder("systemctl", "list-units", "--type=service", "--state=running");

    public List<ServiceInfo> getRunningServices() {
        List<ServiceInfo> services = new ArrayList<>();
        try {
            Process process = processBuilder.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));

            String line;
            boolean isHeader = true;
            while ((line = reader.readLine()) != null) {
                if (isHeader) {
                    isHeader = false;
                    continue;
                }
                ServiceInfo serviceInfo = toServiceInfo(line);
                if (serviceInfo != null) {
                    services.add(serviceInfo);
                }
            }

            process.waitFor();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return services;
    }

    private ServiceInfo toServiceInfo(String serviceLine) {
        try {
            String[] columns = serviceLine.trim().split("\\s+", 5);
            String serviceName = columns[0];
            String status = columns[3];
            String description = columns[4];

            return new ServiceInfo(serviceName, status, description);
        } catch (Exception e) {
            return null;
        }
    }
}

