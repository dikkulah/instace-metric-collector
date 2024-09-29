package org.dikkulah.instancemetriccollector.dto;

public class MetricsPayload {

    private double cpuLoad;
    private long usedMemory;
    private long totalMemory;

    public MetricsPayload(double cpuLoad, long usedMemory, long totalMemory) {
        this.cpuLoad = cpuLoad;
        this.usedMemory = usedMemory;
        this.totalMemory = totalMemory;
    }

    public double getCpuLoad() {
        return cpuLoad;
    }

    public void setCpuLoad(double cpuLoad) {
        this.cpuLoad = cpuLoad;
    }

    public long getUsedMemory() {
        return usedMemory;
    }

    public void setUsedMemory(long usedMemory) {
        this.usedMemory = usedMemory;
    }

    public long getTotalMemory() {
        return totalMemory;
    }

    public void setTotalMemory(long totalMemory) {
        this.totalMemory = totalMemory;
    }

    @Override
    public String toString() {
        return "MetricsPayload{" +
                "cpuLoad=" + cpuLoad +
                ", usedMemory=" + usedMemory +
                ", totalMemory=" + totalMemory +
                '}';
    }
}
