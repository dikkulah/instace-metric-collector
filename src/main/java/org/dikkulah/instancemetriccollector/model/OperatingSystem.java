package org.dikkulah.instancemetriccollector.model;

public enum OperatingSystem {
    LINUX("linux"), WINDOWS("windows");

    private final String osName;

    OperatingSystem(String osName) {
        this.osName = osName;
    }

    public String getOsName() {
        return osName;
    }
}
