package org.dikkulah.instancemetriccollector.service.collector.windows;

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
@Conditional(OperatingSystemCondition.Windows.class)
public class WindowsServiceCollector implements ServiceCollector {
    private final ProcessBuilder processBuilder = new ProcessBuilder("sc", "query", "type=", "service");

    public List<ServiceInfo> getRunningServices() {
        List<ServiceInfo> services = new ArrayList<>();
        try {
            Process process = processBuilder.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));

            String line;
            String serviceName = null;
            String status;

            while ((line = reader.readLine()) != null) {
                if (line.trim().startsWith("SERVICE_NAME:")) {
                    serviceName = line.split(":", 2)[1].trim();
                } else if (line.trim().startsWith("STATE")) {
                    String[] stateInfo = line.trim().split(":");
                    status = stateInfo[1].trim().split(" ")[1];
                    if ("4".equals(status)) {
                        services.add(new ServiceInfo(serviceName, "RUNNING", "No description available"));
                    }
                }
            }

            process.waitFor();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return services;
    }
}
