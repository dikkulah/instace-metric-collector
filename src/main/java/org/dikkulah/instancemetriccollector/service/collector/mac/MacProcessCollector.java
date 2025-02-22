package org.dikkulah.instancemetriccollector.service.collector.mac;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

import org.dikkulah.instancemetriccollector.config.OperatingSystemCondition;
import org.dikkulah.instancemetriccollector.model.ProcessInfo;
import org.dikkulah.instancemetriccollector.service.collector.ProcessCollector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

@Component
@Conditional(OperatingSystemCondition.Mac.class)
public class MacProcessCollector implements ProcessCollector {
    private static final Logger log = LoggerFactory.getLogger(MacServiceCollector.class);

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
}
