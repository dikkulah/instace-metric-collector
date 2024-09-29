package org.dikkulah.instancemetriccollector.service.collector;

import org.dikkulah.instancemetriccollector.model.ServiceInfo;

import java.util.List;

public interface ServiceCollector {
    List<ServiceInfo> getRunningServices();
}
