package org.dikkulah.instancemetriccollector.service.collector.linux;

import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;

import java.util.ArrayList;
import java.util.List;

final class LinuxNetworkUsageParser {

    private LinuxNetworkUsageParser() {
    }

    static List<NetworkUsageInfo> parseProcNetDev(String content) {
        List<NetworkUsageInfo> interfaces = new ArrayList<>();
        String[] lines = content.split("\n");
        for (int i = 2; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) {
                continue;
            }
            int colon = line.indexOf(':');
            if (colon < 0) {
                continue;
            }
            String name = line.substring(0, colon).trim();
            if (name.isEmpty() || name.equals("lo")) {
                continue;
            }
            String[] values = line.substring(colon + 1).trim().split("\\s+");
            if (values.length < 9) {
                continue;
            }
            try {
                long bytesReceived = Long.parseLong(values[0]);
                long bytesSent = Long.parseLong(values[8]);
                interfaces.add(new NetworkUsageInfo(name, bytesReceived, bytesSent));
            } catch (NumberFormatException ignored) {
                // skip malformed row
            }
        }
        return interfaces;
    }
}
