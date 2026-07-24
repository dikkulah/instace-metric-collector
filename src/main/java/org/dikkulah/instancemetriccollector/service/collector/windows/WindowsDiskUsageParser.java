package org.dikkulah.instancemetriccollector.service.collector.windows;

import org.dikkulah.instancemetriccollector.model.DiskUsageInfo;

import java.util.ArrayList;
import java.util.List;

final class WindowsDiskUsageParser {

    private WindowsDiskUsageParser() {
    }

    static List<DiskUsageInfo> parseWmicOutput(String output) {
        List<DiskUsageInfo> mounts = new ArrayList<>();
        String[] lines = output.split("\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("Node,") || trimmed.equals("Node")) {
                continue;
            }
            String[] parts = trimmed.split(",");
            if (parts.length < 4) {
                continue;
            }
            try {
                String mount = parts[1].trim();
                long freeBytes = Long.parseLong(parts[2].trim());
                long totalBytes = Long.parseLong(parts[3].trim());
                if (totalBytes <= 0) {
                    continue;
                }
                long usedBytes = totalBytes - freeBytes;
                double usePercent = (usedBytes * 100.0) / totalBytes;
                mounts.add(new DiskUsageInfo(mount, mount, totalBytes, usedBytes, usePercent));
            } catch (NumberFormatException ignored) {
                // skip malformed row
            }
        }
        return mounts;
    }
}
