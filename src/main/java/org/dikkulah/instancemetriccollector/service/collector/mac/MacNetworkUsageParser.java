package org.dikkulah.instancemetriccollector.service.collector.mac;

import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;

import java.util.ArrayList;
import java.util.List;

final class MacNetworkUsageParser {

    private MacNetworkUsageParser() {
    }

    static List<NetworkUsageInfo> parseNetstatOutput(String output) {
        List<NetworkUsageInfo> interfaces = new ArrayList<>();
        String[] lines = output.split("\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("Name")) {
                continue;
            }
            String[] parts = trimmed.split("\\s+");
            if (parts.length < 10) {
                continue;
            }
            String name = parts[0];
            if (name.equals("lo0") || !parts[2].startsWith("<Link#")) {
                continue;
            }
            try {
                long bytesReceived = Long.parseLong(parts[6]);
                long bytesSent = Long.parseLong(parts[9]);
                interfaces.add(new NetworkUsageInfo(stripInterfaceMarker(name), bytesReceived, bytesSent));
            } catch (NumberFormatException ignored) {
                // skip malformed row
            }
        }
        return interfaces;
    }

    private static String stripInterfaceMarker(String name) {
        return name.endsWith("*") ? name.substring(0, name.length() - 1) : name;
    }
}
