package org.dikkulah.instancemetriccollector.service.collector.linux;

import org.dikkulah.instancemetriccollector.config.OperatingSystemCondition;
import org.dikkulah.instancemetriccollector.dto.ProcessInfo;
import org.dikkulah.instancemetriccollector.service.collector.ProcessCollector;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@Component
@Conditional(OperatingSystemCondition.Linux.class)
public class LinuxProcessCollector implements ProcessCollector {
    private final ProcessBuilder processBuilder = new ProcessBuilder("ps", "-aux");

    public List<ProcessInfo> getRunningProcesses() {
        List<ProcessInfo> processList = new ArrayList<>();
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
                ProcessInfo processInfo = parseProcessLine(line);
                if (processInfo != null) {
                    processList.add(processInfo);
                }
            }
            process.waitFor();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return processList;
    }

    private ProcessInfo parseProcessLine(String line) {
        try {
            String[] columns = line.trim().split("\\s+", 11);
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
