package org.dikkulah.instancemetriccollector.dto;

public record ProcessInfo(String user, int pid, double cpuUsage, double memoryUsage, String command) {
}

