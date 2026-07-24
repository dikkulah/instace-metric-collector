package org.dikkulah.instancemetriccollector.model;

public enum ServiceStatus {
    RUNNING,
    ERROR,
    STOPPED;

    public static ServiceStatus fromStatusCode(int statusCode) {
        if (statusCode == 0) {
            return RUNNING;
        }

        if (statusCode > 0) {
            return ERROR;
        }

        return STOPPED;
    }
}