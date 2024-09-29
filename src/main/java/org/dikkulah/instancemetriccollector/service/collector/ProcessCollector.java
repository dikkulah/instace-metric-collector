package org.dikkulah.instancemetriccollector.service.collector;

import org.dikkulah.instancemetriccollector.model.ProcessInfo;

import java.util.List;

public interface ProcessCollector {
    List<ProcessInfo> getRunningProcesses();
}
