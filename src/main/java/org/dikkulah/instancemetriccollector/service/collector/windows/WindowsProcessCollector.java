package org.dikkulah.instancemetriccollector.service.collector.windows;

import org.dikkulah.instancemetriccollector.config.OperatingSystemCondition;
import org.dikkulah.instancemetriccollector.dto.ProcessInfo;
import org.dikkulah.instancemetriccollector.service.collector.ProcessCollector;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Conditional(OperatingSystemCondition.Windows.class)
public class WindowsProcessCollector implements ProcessCollector {

    private final WindowsCpuUsageCollector windowsCpuUsageCollector = new WindowsCpuUsageCollector();

    public List<ProcessInfo> getRunningProcesses() {
        List<ProcessInfo> processList = new ArrayList<>();
        Map<Integer, Double> cpuUsageMap = windowsCpuUsageCollector.getCpuUsageForProcesses();

        try {
            ProcessBuilder processBuilder = new ProcessBuilder("tasklist");
            Process process = processBuilder.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));

            String line;
            boolean isHeader = true;
            while ((line = reader.readLine()) != null) {
                if (isHeader) {
                    isHeader = false;
                    continue;
                }
                ProcessInfo processInfo = parseProcessLine(line, cpuUsageMap);
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

    private ProcessInfo parseProcessLine(String line, Map<Integer, Double> cpuUsageMap) {
        try {
            String[] columns = line.trim().split("\\s+", 6);
            String command = columns[0];
            int pid = Integer.parseInt(columns[1]);
            double memoryUsage = parseMemoryUsage(columns[4]);

            double cpuUsage = cpuUsageMap.getOrDefault(pid, 0.0);
            return new ProcessInfo("N/A", pid, cpuUsage, memoryUsage, command);
        } catch (Exception e) {
            return null;
        }
    }

    private double parseMemoryUsage(String memoryUsageStr) {
        memoryUsageStr = memoryUsageStr.replace(",", "").replace("K", "");
        return Double.parseDouble(memoryUsageStr);
    }

    private static class WindowsCpuUsageCollector {

        public Map<Integer, Double> getCpuUsageForProcesses() {
            Map<Integer, Double> cpuUsageMap = new HashMap<>();
            try {
                ProcessBuilder processBuilder = new ProcessBuilder("wmic", "path", "Win32_PerfFormattedData_PerfProc_Process", "get", "IDProcess,PercentProcessorTime");
                Process process = processBuilder.start();
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));

                String line;
                boolean isHeader = true;
                while ((line = reader.readLine()) != null) {
                    if (isHeader) {
                        isHeader = false;
                        continue;
                    }
                    if (line.trim().isEmpty()) {
                        continue;
                    }

                    String[] columns = line.trim().split("\\s+");
                    if (columns.length == 2) {
                        int pid = Integer.parseInt(columns[0]);
                        double cpuUsage = Double.parseDouble(columns[1]);
                        cpuUsageMap.put(pid, cpuUsage);
                    }
                }
                process.waitFor();
            } catch (Exception e) {
                e.printStackTrace();
            }
            return cpuUsageMap;
        }
    }
}

