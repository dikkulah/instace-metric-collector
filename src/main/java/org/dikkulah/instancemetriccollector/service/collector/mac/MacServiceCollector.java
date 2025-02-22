package org.dikkulah.instancemetriccollector.service.collector.mac;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

import org.dikkulah.instancemetriccollector.config.OperatingSystemCondition;
import org.dikkulah.instancemetriccollector.model.ServiceInfo;
import org.dikkulah.instancemetriccollector.model.ServiceStatus;
import org.dikkulah.instancemetriccollector.service.collector.ServiceCollector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

@Component
@Conditional(OperatingSystemCondition.Mac.class)
public class MacServiceCollector implements ServiceCollector {
    private static final Logger log = LoggerFactory.getLogger(MacServiceCollector.class);

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
                String[] parts = line.trim().split("\\s+", 3);
                services.add(new ServiceInfo(parts[2], ServiceStatus.fromStatusCode(Integer.parseInt(parts[1])), ""));
            }
        } catch (Exception e) {
            log.error("Error getting running services", e);
        }
        return services;
    }
}
