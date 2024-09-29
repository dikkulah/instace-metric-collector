package org.dikkulah.instancemetriccollector.service.collector;

import org.dikkulah.instancemetriccollector.dto.ProcessInfo;

import java.util.List;

public interface ProcessCollector {
    List<ProcessInfo> getRunningProcesses();
}
