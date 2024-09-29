package org.dikkulah.instancemetriccollector.service;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.dikkulah.instancemetriccollector.dto.MetricsPayload;
import org.dikkulah.instancemetriccollector.service.collector.InstanceMetricsCollector;
import org.dikkulah.instancemetriccollector.service.collector.MetricsCollector;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class InstanceMetricsSender {

    private static final Log log = LogFactory.getLog(InstanceMetricsSender.class);
    private final RestTemplate restTemplate;
    private final MetricsCollector metricsCollector;

    public InstanceMetricsSender(RestTemplate restTemplate, MetricsCollector metricsCollector) {
        this.restTemplate = restTemplate;
        this.metricsCollector = metricsCollector;
    }

    @Scheduled(fixedRate = 6000)
    public void sendMetrics() {
        double cpuLoad = metricsCollector.getCpuLoad();
        long totalMemory = metricsCollector.getTotalMemorySize();

        MetricsPayload payload = new MetricsPayload(cpuLoad, 1, totalMemory);
        log.info(payload);
    }
}
