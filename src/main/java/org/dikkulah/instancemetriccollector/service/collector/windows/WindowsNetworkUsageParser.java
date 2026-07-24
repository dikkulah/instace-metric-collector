package org.dikkulah.instancemetriccollector.service.collector.windows;

import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;

import java.util.ArrayList;
import java.util.List;

final class WindowsNetworkUsageParser {

    private WindowsNetworkUsageParser() {
    }

    static List<NetworkUsageInfo> parsePowerShellOutput(String output) {
        List<NetworkUsageInfo> interfaces = new ArrayList<>();
        String[] lines = output.split("\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("\"Name\"")) {
                continue;
            }
            String[] parts = splitCsvLine(trimmed);
            if (parts.length < 3) {
                continue;
            }
            String name = unquote(parts[0]);
            if (name.isBlank() || name.toLowerCase().contains("loopback")) {
                continue;
            }
            try {
                long bytesReceived = Long.parseLong(unquote(parts[1]));
                long bytesSent = Long.parseLong(unquote(parts[2]));
                interfaces.add(new NetworkUsageInfo(name, bytesReceived, bytesSent));
            } catch (NumberFormatException ignored) {
                // skip malformed row
            }
        }
        return interfaces;
    }

    private static String[] splitCsvLine(String line) {
        List<String> parts = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                inQuotes = !inQuotes;
                current.append(ch);
            } else if (ch == ',' && !inQuotes) {
                parts.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        parts.add(current.toString());
        return parts.toArray(String[]::new);
    }

    private static String unquote(String value) {
        String trimmed = value.trim();
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() >= 2) {
            return trimmed.substring(1, trimmed.length() - 1);
        }
        return trimmed;
    }
}
