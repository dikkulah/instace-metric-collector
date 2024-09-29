package org.dikkulah.instancemetriccollector.model;

public record ProcessInfo(String user, int pid, double cpuUsage, double memoryUsage, String command) {
}

