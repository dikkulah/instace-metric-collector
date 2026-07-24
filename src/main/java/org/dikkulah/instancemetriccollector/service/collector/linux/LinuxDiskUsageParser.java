package org.dikkulah.instancemetriccollector.service.collector.linux;

import org.dikkulah.instancemetriccollector.model.DiskUsageInfo;

import java.util.ArrayList;
import java.util.List;

final class LinuxDiskUsageParser {

    private LinuxDiskUsageParser() {
    }

    static List<DiskUsageInfo> parseDfOutput(String output) {
        List<DiskUsageInfo> mounts = new ArrayList<>();
        String[] lines = output.split("\n");
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) {
                continue;
            }
            String[] parts = line.split("\\s+");
            if (parts.length < 6) {
                continue;
            }
            try {
                String filesystem = parts[0];
                long totalBytes = Long.parseLong(parts[1]);
                long usedBytes = Long.parseLong(parts[2]);
                String mount = parts[5];
                double usePercent = parsePercent(parts[4]);
                if (totalBytes <= 0) {
                    continue;
                }
                mounts.add(new DiskUsageInfo(mount, filesystem, totalBytes, usedBytes, usePercent));
            } catch (NumberFormatException ignored) {
                // skip malformed row
            }
        }
        return mounts;
    }

    private static double parsePercent(String value) {
        String normalized = value.replace("%", "").trim();
        return Double.parseDouble(normalized);
    }
}
