package org.dikkulah.instancemetriccollector.service.collector.mac;

import org.dikkulah.instancemetriccollector.model.DiskUsageInfo;

import java.util.ArrayList;
import java.util.List;

final class MacDiskUsageParser {

    private static final long KILOBYTE = 1024L;

    private MacDiskUsageParser() {
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
            if (parts.length < 9) {
                continue;
            }
            try {
                String filesystem = parts[0];
                long totalBytes = Long.parseLong(parts[1]) * KILOBYTE;
                long usedBytes = Long.parseLong(parts[2]) * KILOBYTE;
                String mount = parts[8];
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
        return Double.parseDouble(value.replace("%", "").trim());
    }
}
